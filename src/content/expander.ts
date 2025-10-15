import { StorageManager } from '../lib/storage';
import { SnippetTrie } from '../lib/trie';
import { TextReplacer } from '../lib/replacer';
import { Settings, Snippet } from '../lib/types';
import { shouldTriggerMatch } from '../lib/word-boundaries';
import { llmManager } from '../lib/llm/manager';
import { CommandParser } from '../lib/command-parser';
import { FormPopup } from '../lib/form-popup';
import { logger } from '../lib/logger';

class TextBlitzExpander {
  private trie: SnippetTrie;
  private settings: Settings | null = null;
  private isExpanding = false;
  private formPopup: FormPopup;
  private keyboardBuffer = '';
  private lastKeyTime = 0;
  private lastExpansionTime = 0;
  private lastExpandedTrigger = '';
  private lastExpandedTime = 0;

  constructor() {
    this.trie = new SnippetTrie(false);
    this.formPopup = new FormPopup();
    this.initialize();
  }

  private async initialize() {
    if (this.settings?.debugMode) {
      const frameInfo = window === window.top ? 'top frame' : 'iframe';
      console.log(`TextBlitz: Starting initialization in ${frameInfo}...`);
    }

    try {
      await StorageManager.initialize();
      this.settings = await StorageManager.getSettings();

      // Set debug mode in TextReplacer
      TextReplacer.setDebugMode(this.settings.debugMode);

      // Initialize LLM providers if API keys present
      if (this.settings.llmKeys.groq) {
        llmManager.setProvider('groq', this.settings.llmKeys.groq, this.settings.llmModels.groq, this.settings.llmTimeout, this.settings.llmSystemPrompt);
      }
      if (this.settings.llmKeys.anthropic) {
        llmManager.setProvider('anthropic', this.settings.llmKeys.anthropic, this.settings.llmModels.anthropic, this.settings.llmTimeout, this.settings.llmSystemPrompt);
      }
      if (this.settings.llmKeys.openai) {
        llmManager.setProvider('openai', this.settings.llmKeys.openai, this.settings.llmModels.openai, this.settings.llmTimeout, this.settings.llmSystemPrompt);
      }
      if (this.settings.llmKeys.gemini) {
        llmManager.setProvider('gemini', this.settings.llmKeys.gemini, this.settings.llmModels.gemini, this.settings.llmTimeout, this.settings.llmSystemPrompt);
      }

      if (this.settings.debugMode) {
        console.log('TextBlitz: Settings loaded', this.settings);
      }

      if (!this.settings.enabled) {
        console.log('TextBlitz: ❌ DISABLED in settings');
        return;
      }

      // Build the trie with all snippets
      const snippets = await StorageManager.getSnippets();
      this.trie.rebuild(snippets);

      // Set up event listeners
      this.setupListeners();

      const snippetCount = Object.keys(snippets).length;
      if (snippetCount === 0) {
        console.warn('TextBlitz: ⚠️ INITIALIZED but NO SNIPPETS FOUND!');
      } else {
        console.log('TextBlitz: ✅ Initialized with', snippetCount, 'snippets');
      }
    } catch (error) {
      console.error('TextBlitz: ❌ Failed to initialize', error);
    }
  }

  private setupListeners() {

    // Listen for input events (fires after text is in the field)
    document.addEventListener('input', this.handleInput.bind(this), true);

    // CRITICAL: Listen for keyboard events with CAPTURE (catches Google Docs, Gist, etc.)
    // Capture phase runs BEFORE sites can stop propagation
    // NOT passive - we need to be able to interact with the event
    document.addEventListener('keydown', this.handleKeydown.bind(this), true);

    // Google Docs: Also try to hook into any textareas (hidden input proxy)
    setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        if (this.settings?.debugMode) {
          console.log('TextBlitz: Found textarea, adding listeners:', {
            id: textarea.id,
            visible: textarea.offsetParent !== null
          });
        }
        textarea.addEventListener('input', this.handleInput.bind(this), { passive: true });
      });
    }, 1000);

    // Listen for storage changes to update the trie
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        if (changes.snippets) {
          this.trie.rebuild(changes.snippets.newValue || {});
        }
        if (changes.settings) {
          this.settings = changes.settings.newValue;
          // Update debug mode when settings change
          TextReplacer.setDebugMode(this.settings.debugMode);
          // Re-initialize LLM providers when keys change
          if (this.settings.llmKeys.groq) {
            llmManager.setProvider('groq', this.settings.llmKeys.groq, this.settings.llmModels.groq, this.settings.llmTimeout, this.settings.llmSystemPrompt);
          }
          if (this.settings.llmKeys.anthropic) {
            llmManager.setProvider('anthropic', this.settings.llmKeys.anthropic, this.settings.llmModels.anthropic, this.settings.llmTimeout, this.settings.llmSystemPrompt);
          }
          if (this.settings.llmKeys.openai) {
            llmManager.setProvider('openai', this.settings.llmKeys.openai, this.settings.llmModels.openai, this.settings.llmTimeout, this.settings.llmSystemPrompt);
          }
          if (this.settings.llmKeys.gemini) {
            llmManager.setProvider('gemini', this.settings.llmKeys.gemini, this.settings.llmModels.gemini, this.settings.llmTimeout, this.settings.llmSystemPrompt);
          }
        }
      }
    });
  }

  private handleInput(event: Event) {
    const target = event.target as HTMLElement;

    if (this.settings?.debugMode) {
      console.log('TextBlitz: handleInput fired, event type:', event.type, 'target:', target.tagName);
    }

    if (!this.settings?.enabled) {
      if (this.settings?.debugMode) console.log('TextBlitz: Extension disabled');
      return;
    }
    if (this.isExpanding) {
      if (this.settings?.debugMode) console.log('TextBlitz: Currently expanding, skipping');
      return;
    }

    // Don't trigger if keyboard buffer just handled this (prevent double expansion)
    if (Date.now() - this.lastExpansionTime < 100) {
      if (this.settings?.debugMode) console.log('TextBlitz: Keyboard buffer just handled expansion, skipping input event');
      return;
    }

    if (!TextReplacer.isValidInputElement(target)) {
      if (this.settings?.debugMode) console.log('TextBlitz: Invalid input element');
      return;
    }

    this.checkForMatch(target);
  }

  // Keyboard buffer handler - catches Google Docs, Gist, etc.
  private handleKeydown(event: KeyboardEvent) {
    if (!this.settings?.enabled || this.isExpanding) return;

    const key = event.key;
    const now = Date.now();

    // Reset buffer if more than 2 seconds since last key
    if (now - this.lastKeyTime > 2000) {
      this.keyboardBuffer = '';
    }
    this.lastKeyTime = now;

    // Ignore modifier keys
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Handle printable characters
    if (key.length === 1) {
      this.keyboardBuffer += key;
    } else if (key === 'Backspace') {
      this.keyboardBuffer = this.keyboardBuffer.slice(0, -1);
    } else if (key === ' ') {
      this.keyboardBuffer += ' ';
    } else {
      return; // Ignore other keys
    }

    if (this.settings?.debugMode) {
      console.log('TextBlitz: Keyboard buffer:', this.keyboardBuffer);
    }

    // Keep buffer size reasonable
    if (this.keyboardBuffer.length > 200) {
      this.keyboardBuffer = this.keyboardBuffer.slice(-200);
    }

    // Check for trigger match in buffer
    this.checkBufferForMatch();
  }

  // Check keyboard buffer for triggers
  private async checkBufferForMatch() {
    if (!this.keyboardBuffer) return;

    // Don't check if we just did an expansion via input event
    if (Date.now() - this.lastExpansionTime < 500) return;

    // Only check last 50 chars to avoid matching old text
    const recentBuffer = this.keyboardBuffer.slice(-50);

    const match = this.trie.findMatch(recentBuffer);
    if (!match) return;

    const { snippet } = match;
    const trigger = this.settings!.caseSensitive ? snippet.trigger : snippet.trigger.toLowerCase();
    const bufferToCheck = this.settings!.caseSensitive ? recentBuffer : recentBuffer.toLowerCase();

    if (this.settings?.debugMode) {
      console.log('TextBlitz: Buffer match -', snippet.label, 'trigger:', trigger);
    }

    if (!bufferToCheck.endsWith(trigger)) return;

    // Check word boundaries
    const textBefore = recentBuffer.substring(0, recentBuffer.length - trigger.length);
    const textAfter = '';

    if (!shouldTriggerMatch(textBefore, trigger, textAfter, snippet.triggerMode)) {
      return;
    }

    // Get focused element
    const element = document.activeElement as HTMLElement;
    if (!element) {
      if (this.settings?.debugMode) {
        console.log('TextBlitz: No activeElement found');
      }
      return;
    }

    if (this.settings?.debugMode) {
      console.log('TextBlitz: Expanding on', element.tagName);
    }

    // Clear buffer before expansion
    this.keyboardBuffer = '';

    // Create unique expansion key to prevent double expansion
    const expandKey = `${snippet.trigger}-${recentBuffer}`;
    if (this.lastExpandedTrigger === expandKey && Date.now() - this.lastExpandedTime < 1000) {
      if (this.settings?.debugMode) {
        console.log('TextBlitz: Skipping duplicate expansion for same trigger');
      }
      return;
    }
    this.lastExpandedTrigger = expandKey;
    this.lastExpandedTime = Date.now();

    // Mark that we're about to expand - block input events immediately
    this.lastExpansionTime = Date.now();

    // Use setTimeout to let browser process the keystroke first
    // This ensures field value and cursor position are correct
    setTimeout(async () => {
      try {
        // Double-check we haven't already expanded (race condition protection)
        if (this.isExpanding) return;

        // Set flag IMMEDIATELY to block any other expansion attempts
        // CRITICAL: Prevents doubling in Google Docs and other async editors
        this.isExpanding = true;

        // Verify element is still valid and in document
        if (!element || !document.contains(element)) {
          if (this.settings?.debugMode) {
            console.log('TextBlitz: Element no longer in document, skipping expansion');
          }
          this.isExpanding = false;
          return;
        }

        // Check if expansion has form commands
        if (CommandParser.hasFormCommands(snippet.expansion)) {
          await this.expandWithForm(element, snippet);
          this.isExpanding = false;
          this.lastExpansionTime = Date.now();
          return;
        }

        // Handle dynamic vs static snippets
        if (snippet.type === 'dynamic') {
          await this.expandDynamic(element, snippet);
          this.isExpanding = false;
          this.lastExpansionTime = Date.now();
          return;
        }

        // Static expansion
        const success = await TextReplacer.replace(element, snippet.trigger, snippet.expansion, snippet.caseTransform);
        this.isExpanding = false;

        if (success) {
          // Update expansion time on success
          this.lastExpansionTime = Date.now();

          StorageManager.incrementUsage(snippet.id).catch(err => {
            console.error('TextBlitz: Failed to update usage stats', err);
          });
        }
      } catch (error) {
        this.isExpanding = false;
        console.error('TextBlitz: Error in delayed expansion:', error);
      }
    }, 0);
  }

  // Get text before cursor - simplified and robust
  private getTextBeforeCursor(element: HTMLElement): string {
    try {
      // For regular inputs/textareas - simple
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        const cursorPos = element.selectionStart ?? element.value.length;
        return element.value.substring(0, cursorPos);
      }

      // For contenteditable - try to get text, but don't fail if we can't
      if (element.isContentEditable) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          // No selection - just use all text
          return element.textContent || '';
        }

        const range = selection.getRangeAt(0);
        let { startContainer, startOffset } = range;

        // If we're in a text node, easy
        if (startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = startContainer as Text;
          return (textNode.textContent || '').substring(0, startOffset);
        }

        // If we're in an element, try to find text
        if (startContainer.childNodes.length > 0) {
          const childIndex = Math.min(startOffset, startContainer.childNodes.length - 1);
          const childNode = startContainer.childNodes[childIndex];
          if (childNode && childNode.nodeType === Node.TEXT_NODE) {
            return (childNode as Text).textContent || '';
          }
        }

        // Fallback: just use all text content
        return element.textContent || '';
      }

      return '';
    } catch (error) {
      // If anything fails, return empty string - let tiers handle it
      if (this.settings?.debugMode) {
        console.log('TextBlitz: Error getting text before cursor, will try expansion anyway:', error);
      }
      return '';
    }
  }

  private async checkForMatch(element: HTMLElement): Promise<boolean> {
    // Get text before cursor (simplified - doesn't fail)
    const textBeforeCursor = this.getTextBeforeCursor(element);

    if (this.settings?.debugMode) {
      console.log('TextBlitz: Text before cursor:', textBeforeCursor);
    }

    if (!textBeforeCursor) return false;

    // Try to find a matching trigger
    const match = this.trie.findMatch(textBeforeCursor);
    if (!match) return false;

    const { snippet } = match;
    const trigger = this.settings!.caseSensitive ? snippet.trigger : snippet.trigger.toLowerCase();
    const textToCheck = this.settings!.caseSensitive ? textBeforeCursor : textBeforeCursor.toLowerCase();

    // Verify trigger is at the end
    if (!textToCheck.endsWith(trigger)) return false;

    // Extract context for word boundary checking
    const textBefore = textBeforeCursor.substring(0, textBeforeCursor.length - trigger.length);
    const textAfter = ''; // We don't know what's after - word boundary check will be lenient

    // Check if trigger should match based on mode
    if (!shouldTriggerMatch(textBefore, trigger, textAfter, snippet.triggerMode)) {
      return false;
    }

    // Create unique expansion key to prevent double expansion
    const expandKey = `${snippet.trigger}-${textBeforeCursor}`;
    if (this.lastExpandedTrigger === expandKey && Date.now() - this.lastExpandedTime < 1000) {
      if (this.settings?.debugMode) {
        console.log('TextBlitz: Skipping duplicate expansion for same trigger');
      }
      return false;
    }
    this.lastExpandedTrigger = expandKey;
    this.lastExpandedTime = Date.now();

    if (this.settings?.debugMode) {
      console.log('TextBlitz: ✅ Trigger matched:', trigger, 'snippet:', snippet.label);
    }

    // Check if expansion has form commands
    if (CommandParser.hasFormCommands(snippet.expansion)) {
      await this.expandWithForm(element, snippet);
      return true;
    }

    // Handle dynamic vs static snippets
    if (snippet.type === 'dynamic') {
      await this.expandDynamic(element, snippet);
      return true;
    } else {
      // Static expansion - pass to tiered replacer
      this.isExpanding = true;
      const success = await TextReplacer.replace(element, snippet.trigger, snippet.expansion, snippet.caseTransform);
      this.isExpanding = false;

      if (success) {
        StorageManager.incrementUsage(snippet.id).catch(err => {
          console.error('TextBlitz: Failed to update usage stats', err);
        });
      }

      return success;
    }
  }

  private async expandWithForm(element: HTMLElement, snippet: Snippet) {
    this.isExpanding = true;

    try {
      // Extract form fields from expansion
      const fields = CommandParser.extractFormFields(snippet.expansion);

      if (fields.length === 0) {
        console.warn('TextBlitz: No form fields found in expansion');
        return;
      }

      // Show form popup and wait for user input
      await new Promise<void>((resolve, reject) => {
        this.formPopup.show(
          fields,
          async (formData) => {
            try {
              // Substitute form values into expansion
              let processedExpansion = CommandParser.substituteFormValues(snippet.expansion, formData);

              // Process other commands (date, time, clipboard, etc.)
              processedExpansion = await CommandParser.processCommands(processedExpansion);

              // Replace trigger with processed expansion
              const success = await TextReplacer.replace(element, snippet.trigger, processedExpansion, snippet.caseTransform);

              if (success) {
                StorageManager.incrementUsage(snippet.id).catch(err => {
                  console.error('TextBlitz: Failed to update usage stats', err);
                });
              }

              resolve();
            } catch (error) {
              console.error('TextBlitz: Form expansion failed:', error);
              reject(error);
            }
          },
          () => {
            // User cancelled
            console.log('TextBlitz: Form cancelled by user');
            resolve();
          }
        );
      });
    } catch (error) {
      console.error('TextBlitz: Form popup error:', error);
    } finally {
      this.isExpanding = false;
    }
  }

  private async expandDynamic(element: HTMLElement, snippet: Snippet) {
    this.isExpanding = true;

    try {
      // Get LLM provider and prompt
      const provider = snippet.llmProvider || this.settings!.llmDefaultProvider;
      const prompt = snippet.llmPrompt;

      if (!prompt) {
        throw new Error('No LLM prompt defined for dynamic snippet');
      }

      // Call LLM
      const response = await llmManager.complete(provider, {
        prompt,
        maxTokens: this.settings!.llmMaxTokens,
        temperature: 0.7,
      });

      // Replace trigger with LLM response
      const success = await TextReplacer.replace(element, snippet.trigger, response.text, snippet.caseTransform);

      if (success) {
        StorageManager.incrementUsage(snippet.id).catch(err => {
          console.error('TextBlitz: Failed to update usage stats', err);
        });
      }
    } catch (error) {
      console.error('TextBlitz: LLM expansion failed:', error);

      // Determine error message
      let errorMsg = 'LLM failed';
      if (error instanceof Error) {
        if (error.message.includes('not initialized') || error.message.includes('API key')) {
          errorMsg = 'LLM not configured - add API key in settings';
        } else if (error.message.includes('rate limit')) {
          errorMsg = 'Rate limited - wait a moment';
        } else {
          errorMsg = `LLM error: ${error.message}`;
        }
      }

      // Fallback to static text if available
      if (snippet.fallbackText) {
        await TextReplacer.replace(element, snippet.trigger, snippet.fallbackText, snippet.caseTransform);
      } else {
        // Show error to user by replacing trigger with error message
        await TextReplacer.replace(element, snippet.trigger, `[${errorMsg}]`, snippet.caseTransform);
      }
    } finally {
      this.isExpanding = false;
    }
  }
}

// Initialize the expander when the content script loaded
logger.info('init', 'Content script loaded', logger.getSiteContext());
console.log('TextBlitz: Content script loaded!');

// Expose logger globally for debugging
(window as any).TextBlitzLogger = logger;
(window as any).getTextBlitzDebugReport = () => {
  const report = logger.formatForGitHub();
  console.log(report);
  console.log('\n📋 Debug report generated! Copy the text above and paste into GitHub issue.');
  return report;
};

console.log('💡 Debug help: Run getTextBlitzDebugReport() to generate error report for GitHub');

try {
  new TextBlitzExpander();
} catch (error) {
  logger.error('init', 'Failed to create expander', {
    error: error instanceof Error ? error.message : String(error)
  });
  console.error('TextBlitz: Failed to create expander', error);
}
