import { StorageManager } from '../lib/storage';
import { SnippetTrie } from '../lib/trie';
import { TextReplacer } from '../lib/replacer';
import { Settings, Snippet } from '../lib/types';
import { shouldTriggerMatch } from '../lib/word-boundaries';
import { llmManager } from '../lib/llm/manager';

class TextBlitzExpander {
  private trie: SnippetTrie;
  private settings: Settings | null = null;
  private isExpanding = false;

  constructor() {
    this.trie = new SnippetTrie(false);
    this.initialize();
  }

  private async initialize() {
    console.log('TextBlitz: Starting initialization...');
    try {
      await StorageManager.initialize();
      this.settings = await StorageManager.getSettings();

      // Set debug mode in TextReplacer
      TextReplacer.setDebugMode(this.settings.debugMode);

      // Initialize LLM providers if API keys present
      if (this.settings.llmKeys.groq) {
        llmManager.setProvider('groq', this.settings.llmKeys.groq, this.settings.llmTimeout);
      }
      if (this.settings.llmKeys.anthropic) {
        llmManager.setProvider('anthropic', this.settings.llmKeys.anthropic, this.settings.llmTimeout);
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
    document.addEventListener('input', this.handleInput.bind(this), { passive: true });

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
            llmManager.setProvider('groq', this.settings.llmKeys.groq, this.settings.llmTimeout);
          }
          if (this.settings.llmKeys.anthropic) {
            llmManager.setProvider('anthropic', this.settings.llmKeys.anthropic, this.settings.llmTimeout);
          }
        }
      }
    });
  }

  private handleInput(event: Event) {
    const target = event.target as HTMLElement;

    if (!this.settings?.enabled) return;
    if (this.isExpanding) return;
    if (!TextReplacer.isValidInputElement(target)) return;

    this.checkForMatch(target);
  }

  private async checkForMatch(element: HTMLElement): Promise<boolean> {
    let textBeforeCursor: string;
    let textAfter: string;

    // Handle different element types
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      // Regular input/textarea
      const cursorPos = element.selectionStart ?? element.value.length;
      if (cursorPos === 0) return false;

      textBeforeCursor = element.value.substring(0, cursorPos);
      textAfter = element.value.substring(cursorPos);
    } else if (element.isContentEditable) {
      // Contenteditable element
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;

      const range = selection.getRangeAt(0);
      const { startContainer, startOffset } = range;

      if (startContainer.nodeType !== Node.TEXT_NODE) return false;

      const textNode = startContainer as Text;
      const text = textNode.textContent || '';

      textBeforeCursor = text.substring(0, startOffset);
      textAfter = text.substring(startOffset);
    } else {
      return false;
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

    // Check if trigger should match based on mode
    if (!shouldTriggerMatch(textBefore, trigger, textAfter, snippet.triggerMode)) {
      return false;
    }

    // Handle dynamic vs static snippets
    if (snippet.type === 'dynamic') {
      await this.expandDynamic(element, snippet);
      return true;
    } else {
      // Static expansion (existing behavior)
      this.isExpanding = true;
      const success = await TextReplacer.replace(element, snippet.trigger, snippet.expansion);
      this.isExpanding = false;

      if (success) {
        StorageManager.incrementUsage(snippet.id).catch(err => {
          console.error('TextBlitz: Failed to update usage stats', err);
        });
      }

      return success;
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
      const success = await TextReplacer.replace(element, snippet.trigger, response.text);

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
        await TextReplacer.replace(element, snippet.trigger, snippet.fallbackText);
      } else {
        // Show error to user by replacing trigger with error message
        await TextReplacer.replace(element, snippet.trigger, `[${errorMsg}]`);
      }
    } finally {
      this.isExpanding = false;
    }
  }
}

// Initialize the expander when the content script loads
console.log('TextBlitz: Content script loaded!');
try {
  new TextBlitzExpander();
} catch (error) {
  console.error('TextBlitz: Failed to create expander', error);
}
