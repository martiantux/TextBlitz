import { StorageManager } from '../lib/storage';
import { SnippetTrie } from '../lib/trie';
import { TextReplacer } from '../lib/replacer';
import { Settings, Snippet } from '../lib/types';
import { shouldTriggerMatch } from '../lib/word-boundaries';
import { llmManager } from '../lib/llm/manager';
import { CommandParser } from '../lib/command-parser';
import { FormPopup } from '../lib/form-popup';
import { logger } from '../lib/logger';
import { ElementLockManager } from '../lib/element-lock';
import { SiteDetector } from '../lib/site-detector';

/**
 * NEW ARCHITECTURE:
 * - Single detection path via input events only
 * - Element-level locking prevents concurrent expansions
 * - Debounced checking prevents event loops
 * - Site-specific handling for Google Docs/React/Vue
 */
class TextBlitzExpander {
  private trie: SnippetTrie;
  private settings: Settings | null = null;
  private formPopup: FormPopup;
  private lockManager: ElementLockManager;
  private checkTimeout: number | null = null;

  constructor() {
    this.trie = new SnippetTrie();
    this.formPopup = new FormPopup();
    this.lockManager = ElementLockManager.getInstance();
    this.initialize();
  }

  private async initialize() {
    try {
      await StorageManager.initialize();
      this.settings = await StorageManager.getSettings();
      TextReplacer.setDebugMode(this.settings.debugMode);

      // Initialize LLM providers
      this.initializeLLMProviders();

      if (!this.settings.enabled) {
        console.log('TextBlitz: ❌ DISABLED in settings');
        return;
      }

      const snippets = await StorageManager.getSnippets();
      this.trie.rebuild(snippets);
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

  private initializeLLMProviders() {
    if (!this.settings) return;

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

  private setupListeners() {
    // Single input event listener with capture (catches all input changes)
    document.addEventListener('input', this.handleInput.bind(this), true);

    // Storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        if (changes.snippets) {
          this.trie.rebuild(changes.snippets.newValue || {});
        }
        if (changes.settings) {
          this.settings = changes.settings.newValue;
          TextReplacer.setDebugMode(this.settings.debugMode);
          this.initializeLLMProviders();
        }
      }
    });
  }

  private handleInput(event: Event) {
    if (!this.settings?.enabled) return;

    const target = event.target as HTMLElement;

    // Only process valid input elements
    if (!TextReplacer.isValidInputElement(target)) {
      return;
    }

    // Check if element is locked
    if (this.lockManager.isLocked(target)) {
      if (this.settings.debugMode) {
        console.log('TextBlitz: Element is locked, skipping check');
      }
      return;
    }

    // Debounce to prevent multiple rapid checks
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    this.checkTimeout = window.setTimeout(() => {
      this.checkForMatch(target);
    }, 10);
  }

  private async checkForMatch(element: HTMLElement) {
    // Get text before cursor
    const textBeforeCursor = this.getTextBeforeCursor(element);

    if (!textBeforeCursor) return;

    // Find matching trigger
    const match = this.trie.findMatch(textBeforeCursor);
    if (!match) return;

    const { snippet } = match;
    const trigger = snippet.caseSensitive ? snippet.trigger : snippet.trigger.toLowerCase();
    const textToCheck = snippet.caseSensitive ? textBeforeCursor : textBeforeCursor.toLowerCase();

    // Verify trigger is at end
    if (!textToCheck.endsWith(trigger)) return;

    // Extract actual typed trigger
    const actualTypedTrigger = textBeforeCursor.substring(textBeforeCursor.length - trigger.length);

    // Check word boundaries
    const textBefore = textBeforeCursor.substring(0, textBeforeCursor.length - trigger.length);
    if (!shouldTriggerMatch(textBefore, trigger, '', snippet.triggerMode)) {
      return;
    }

    if (this.settings?.debugMode) {
      console.log('TextBlitz: ✅ Trigger matched:', trigger, 'snippet:', snippet.label);
    }

    // Lock element before expansion
    if (!this.lockManager.lock(element)) {
      if (this.settings?.debugMode) {
        console.log('TextBlitz: Failed to lock element, another expansion in progress');
      }
      return;
    }

    try {
      // Handle different snippet types
      if (CommandParser.hasFormCommands(snippet.expansion)) {
        await this.expandWithForm(element, snippet, actualTypedTrigger);
      } else if (snippet.type === 'dynamic') {
        await this.expandDynamic(element, snippet, actualTypedTrigger);
      } else {
        // Static expansion
        const success = await TextReplacer.replace(
          element,
          snippet.trigger,
          snippet.expansion,
          snippet.caseTransform,
          actualTypedTrigger
        );

        if (success) {
          StorageManager.incrementUsage(snippet.id).catch(err => {
            console.error('TextBlitz: Failed to update usage stats', err);
          });
        } else {
          // Mark failed to prevent retry loops
          this.lockManager.markFailed(element);
        }
      }
    } catch (error) {
      console.error('TextBlitz: Error during expansion:', error);
      this.lockManager.markFailed(element);
    } finally {
      // Always unlock
      this.lockManager.unlock(element);
    }
  }

  private getTextBeforeCursor(element: HTMLElement): string {
    try {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        const cursorPos = element.selectionStart ?? element.value.length;
        return element.value.substring(0, cursorPos);
      }

      if (element.isContentEditable) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          return element.textContent || '';
        }

        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        return preCaretRange.toString();
      }

      return '';
    } catch (error) {
      if (this.settings?.debugMode) {
        console.log('TextBlitz: Error getting text before cursor:', error);
      }
      return '';
    }
  }

  private async expandWithForm(element: HTMLElement, snippet: Snippet, typedTrigger?: string) {
    const fields = CommandParser.extractFormFields(snippet.expansion);

    if (fields.length === 0) {
      console.warn('TextBlitz: No form fields found in expansion');
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.formPopup.show(
        fields,
        async (formData) => {
          try {
            let processedExpansion = CommandParser.substituteFormValues(snippet.expansion, formData);
            processedExpansion = await CommandParser.processCommands(processedExpansion);

            const success = await TextReplacer.replace(element, snippet.trigger, processedExpansion, snippet.caseTransform, typedTrigger);

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
          if (this.settings?.debugMode) {
            console.log('TextBlitz: Form cancelled by user');
          }
          resolve();
        }
      );
    });
  }

  private async expandDynamic(element: HTMLElement, snippet: Snippet, typedTrigger?: string) {
    try {
      const provider = snippet.llmProvider || this.settings!.llmDefaultProvider;
      const prompt = snippet.llmPrompt;

      if (!prompt) {
        throw new Error('No LLM prompt defined for dynamic snippet');
      }

      const response = await llmManager.complete(provider, {
        prompt,
        maxTokens: this.settings!.llmMaxTokens,
        temperature: 0.7,
      });

      const success = await TextReplacer.replace(element, snippet.trigger, response.text, snippet.caseTransform, typedTrigger);

      if (success) {
        StorageManager.incrementUsage(snippet.id).catch(err => {
          console.error('TextBlitz: Failed to update usage stats', err);
        });
      }
    } catch (error) {
      console.error('TextBlitz: LLM expansion failed:', error);

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

      if (snippet.fallbackText) {
        await TextReplacer.replace(element, snippet.trigger, snippet.fallbackText, snippet.caseTransform, typedTrigger);
      } else {
        await TextReplacer.replace(element, snippet.trigger, `[${errorMsg}]`, snippet.caseTransform, typedTrigger);
      }
    }
  }
}

// Initialize
logger.info('init', 'Content script loaded', logger.getSiteContext());
console.log('TextBlitz: Content script loaded!');

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
