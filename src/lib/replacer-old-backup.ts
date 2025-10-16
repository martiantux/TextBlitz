import { Snippet, CaseTransform } from './types';
import { CommandParser } from './command-parser';
import { CaseTransformer } from './case-transform';
import { logger } from './logger';
import { CKEditorHandler } from './editors/ckeditor';

export class TextReplacer {
  private static debugMode = false;

  static setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    logger.setDebugMode(enabled);
  }

  private static log(...args: any[]) {
    if (this.debugMode) {
      console.log(...args);
    }
  }

  // Get text from element (universal)
  private static getElementText(element: HTMLElement): string {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    } else if (element.isContentEditable) {
      return element.textContent || '';
    }
    return '';
  }

  // Verify that insertion happened AND trigger was removed
  private static verifyInsertion(element: HTMLElement, expectedText: string, trigger: string): boolean {
    const actual = this.getElementText(element);

    // Check 1: Expansion must be present (check first 10 chars to be safe)
    const checkText = expectedText.substring(0, Math.min(10, expectedText.length));
    const expansionPresent = actual.includes(checkText);

    if (!expansionPresent) {
      this.log('TextBlitz: Verification failed - expansion not found in text');
      return false;
    }

    // Check 2: Trigger should NOT be present at the end of the text
    // (it should have been removed during replacement)
    const triggerStillPresent = actual.endsWith(trigger);

    if (triggerStillPresent) {
      this.log('TextBlitz: Verification failed - trigger still present after expansion');
      return false;
    }

    this.log('TextBlitz: Verification passed - expansion present and trigger removed');
    return true;
  }

  // Detect framework type
  private static detectFramework(element: HTMLElement): string {
    // Check for React
    const reactKeys = Object.keys(element).find(key =>
      key.startsWith('__react') || key.startsWith('_react')
    );
    if (reactKeys) return 'react';

    // Check for Vue
    if ('__vue__' in element || '__vueParentComponent' in element) return 'vue';

    // Check for Shadow DOM
    if (element.shadowRoot) return 'shadow';

    // Check for complex contenteditable (CodeMirror, Monaco, etc.)
    if (element.classList.contains('CodeMirror') ||
        element.classList.contains('monaco-editor') ||
        element.getAttribute('data-lexical-editor') !== null) {
      return 'custom-editor';
    }

    return 'standard';
  }

  // TIER 0: Direct Simple Manipulation (for basic inputs/textareas)
  private static async tier0DirectManipulation(
    element: HTMLElement,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: Trying Tier 0 - Direct Manipulation');

      // Only for textarea and input
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        const value = element.value;
        const cursorPos = element.selectionStart ?? value.length;

        // Strategy 1: Find trigger at end of value (most common case)
        if (value.endsWith(trigger)) {
          const beforeTrigger = value.substring(0, value.length - trigger.length);
          const newValue = beforeTrigger + expansion;

          element.value = newValue;
          const newCursorPos = newValue.length;
          element.setSelectionRange(newCursorPos, newCursorPos);

          element.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: expansion
          }));

          this.log('TextBlitz: ✅ Tier 0 succeeded (end of value)');
          return true;
        }

        // Strategy 2: Find trigger before cursor
        const textBefore = value.substring(0, cursorPos);
        if (textBefore.endsWith(trigger)) {
          const beforeTrigger = value.substring(0, cursorPos - trigger.length);
          const afterCursor = value.substring(cursorPos);
          const newValue = beforeTrigger + expansion + afterCursor;

          element.value = newValue;
          const newCursorPos = beforeTrigger.length + expansion.length;
          element.setSelectionRange(newCursorPos, newCursorPos);

          element.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: expansion
          }));

          this.log('TextBlitz: ✅ Tier 0 succeeded (before cursor)');
          return true;
        }

        // Strategy 3: Search for trigger anywhere in value (last occurrence)
        const triggerIndex = value.lastIndexOf(trigger);
        if (triggerIndex !== -1) {
          const beforeTrigger = value.substring(0, triggerIndex);
          const afterTrigger = value.substring(triggerIndex + trigger.length);
          const newValue = beforeTrigger + expansion + afterTrigger;

          element.value = newValue;
          const newCursorPos = beforeTrigger.length + expansion.length;
          element.setSelectionRange(newCursorPos, newCursorPos);

          element.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: expansion
          }));

          this.log('TextBlitz: ✅ Tier 0 succeeded (found in value)');
          return true;
        }

        this.log('TextBlitz: Tier 0 - trigger not found in value');
        return false;
      }

      return false;
    } catch (error) {
      this.log('TextBlitz: Tier 0 failed:', error);
      return false;
    }
  }

  // TIER 1: ExecCommand (works on most contenteditables)
  private static async tier1ExecCommand(
    element: HTMLElement,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: Trying Tier 1 - execCommand');

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;

      const range = selection.getRangeAt(0);
      let { startContainer, startOffset } = range;

      // Find text node if we're in an element
      if (startContainer.nodeType !== Node.TEXT_NODE) {
        if (startContainer.childNodes.length > 0) {
          const childIndex = Math.min(startOffset, startContainer.childNodes.length - 1);
          const childNode = startContainer.childNodes[childIndex];
          if (childNode && childNode.nodeType === Node.TEXT_NODE) {
            startContainer = childNode;
            startOffset = (childNode as Text).textContent?.length || 0;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }

      const textNode = startContainer as Text;
      const text = textNode.textContent || '';
      const beforeCursor = text.substring(0, startOffset);

      if (!beforeCursor.endsWith(trigger)) return false;

      // Select trigger
      const newRange = document.createRange();
      const triggerStart = startOffset - trigger.length;
      newRange.setStart(textNode, triggerStart);
      newRange.setEnd(textNode, startOffset);
      selection.removeAllRanges();
      selection.addRange(newRange);

      // Delete and insert
      const deleted = document.execCommand('delete', false);
      if (!deleted) return false;

      const inserted = document.execCommand('insertText', false, expansion);
      if (!inserted) return false;

      // Dispatch events
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        inputType: 'insertText',
        data: expansion
      }));

      this.log('TextBlitz: ✅ Tier 1 succeeded');
      return true;
    } catch (error) {
      this.log('TextBlitz: Tier 1 failed:', error);
      return false;
    }
  }

  // TIER 2: Aggressive Event Dispatching (React/Vue)
  private static async tier2AggressiveEvents(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    framework: string
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: Trying Tier 2 - Aggressive Events (framework:', framework, ')');

      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        return false; // Tier 2 only for inputs
      }

      const cursorPos = element.selectionStart ?? element.value.length;
      const value = element.value;

      // CRITICAL FIX: Find the trigger in the value
      // Check three locations: before cursor, at end, and last occurrence
      let triggerStart = -1;
      let triggerEnd = -1;

      // Strategy 1: Before cursor (most common)
      const textBeforeCursor = value.substring(0, cursorPos);
      if (textBeforeCursor.endsWith(trigger)) {
        triggerStart = cursorPos - trigger.length;
        triggerEnd = cursorPos;
      }
      // Strategy 2: At end of value
      else if (value.endsWith(trigger)) {
        triggerStart = value.length - trigger.length;
        triggerEnd = value.length;
      }
      // Strategy 3: Last occurrence in value
      else {
        triggerStart = value.lastIndexOf(trigger);
        if (triggerStart !== -1) {
          triggerEnd = triggerStart + trigger.length;
        }
      }

      // If trigger not found, fail
      if (triggerStart === -1) {
        this.log('TextBlitz: Tier 2 - trigger not found in value');
        return false;
      }

      // Build new value with trigger removed and expansion inserted
      const textBefore = value.substring(0, triggerStart);
      const textAfter = value.substring(triggerEnd);
      const newValue = textBefore + expansion + textAfter;

      // Get native input value setter for React compatibility
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

      // Set value using native setter (bypasses React's control)
      if (element instanceof HTMLInputElement && nativeInputValueSetter) {
        nativeInputValueSetter.call(element, newValue);
      } else if (element instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(element, newValue);
      } else {
        element.value = newValue;
      }

      // React 16+ _valueTracker fix
      const tracker = (element as any)._valueTracker;
      if (tracker) {
        tracker.setValue(''); // Force React to detect change
      }

      // Dispatch comprehensive events in correct order
      const events = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
      ];

      for (const event of events) {
        element.dispatchEvent(event);
      }

      // Set cursor position
      const newCursorPos = textBefore.length + expansion.length;
      try {
        element.setSelectionRange(newCursorPos, newCursorPos);
      } catch (e) {
        // Ignore - some input types don't support selection
      }

      this.log('TextBlitz: ✅ Tier 2 succeeded');
      return true;
    } catch (error) {
      this.log('TextBlitz: Tier 2 failed:', error);
      return false;
    }
  }

  // TIER 3: Clipboard Injection
  private static async tier3Clipboard(
    element: HTMLElement,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: Trying Tier 3 - Clipboard');

      // Save current clipboard
      let previousClipboard = '';
      try {
        previousClipboard = await navigator.clipboard.readText();
      } catch (e) {
        // No clipboard permission
      }

      // Copy expansion to clipboard
      await navigator.clipboard.writeText(expansion);

      // Focus element
      element.focus();

      // Select trigger if in input/textarea
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        const cursorPos = element.selectionStart ?? element.value.length;
        const triggerStart = cursorPos - trigger.length;
        element.setSelectionRange(triggerStart, cursorPos);
      } else if (element.isContentEditable) {
        // For contenteditable, select trigger via execCommand
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          let { startContainer, startOffset } = range;

          if (startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = startContainer as Text;
            const text = textNode.textContent || '';
            if (text.substring(0, startOffset).endsWith(trigger)) {
              const newRange = document.createRange();
              newRange.setStart(textNode, startOffset - trigger.length);
              newRange.setEnd(textNode, startOffset);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        }
      }

      // Paste
      const pasted = document.execCommand('paste', false);

      // Restore clipboard
      if (previousClipboard) {
        try {
          await navigator.clipboard.writeText(previousClipboard);
        } catch (e) {
          // Ignore
        }
      }

      if (!pasted) return false;

      this.log('TextBlitz: ✅ Tier 3 succeeded');
      return true;
    } catch (error) {
      this.log('TextBlitz: Tier 3 failed:', error);
      return false;
    }
  }

  // TIER 4: Keyboard Simulation (slowest but most reliable)
  private static async tier4Keyboard(
    element: HTMLElement,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: Trying Tier 4 - Keyboard Simulation');

      element.focus();

      // Simulate backspaces to delete trigger
      for (let i = 0; i < trigger.length; i++) {
        this.simulateKey(element, 'Backspace', 'Backspace', 8);
        await this.delay(10);
      }

      // Type expansion character by character
      for (const char of expansion) {
        const code = char === '\n' ? 'Enter' : char;
        const keyCode = char.charCodeAt(0);
        this.simulateKey(element, char, code, keyCode);
        await this.delay(10);
      }

      this.log('TextBlitz: ✅ Tier 4 succeeded');
      return true;
    } catch (error) {
      this.log('TextBlitz: Tier 4 failed:', error);
      return false;
    }
  }

  // Simulate keyboard event
  private static simulateKey(element: HTMLElement, key: string, code: string, keyCode: number) {
    const options = {
      key,
      code,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    };

    element.dispatchEvent(new KeyboardEvent('keydown', options));
    element.dispatchEvent(new KeyboardEvent('keypress', options));
    element.dispatchEvent(new KeyboardEvent('keyup', options));
  }

  // Delay helper
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // MAIN REPLACE METHOD - Try all tiers with retry logic
  static async replace(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    caseTransform?: CaseTransform,
    typedTrigger?: string,
    retryCount: number = 0
  ): Promise<boolean> {
    // Use typed trigger if provided, otherwise fall back to canonical trigger
    const triggerToRemove = typedTrigger || trigger;
    const context = {
      element: logger.getElementContext(element),
      site: logger.getSiteContext(),
      snippet: { trigger }
    };

    try {
      logger.info('expansion', 'Starting replacement', context);

      // Validate element still exists and is in document
      if (!document.contains(element)) {
        logger.warn('expansion', 'Element no longer in document', context);
        return false;
      }

      // Check if element is still focused (helps detect cursor movement)
      const isFocused = document.activeElement === element;
      if (!isFocused) {
        logger.warn('expansion', 'Element lost focus, may have cursor movement', context);
        // Continue anyway - might still work
      }

      // Process commands
      let processedExpansion = await CommandParser.processCommands(expansion);

      // Apply case transformation
      if (caseTransform && caseTransform !== 'none') {
        processedExpansion = CaseTransformer.transform(processedExpansion, caseTransform, trigger);
      }

      // Parse cursor (simplified - just remove {cursor} for now)
      const cursorMarker = '{cursor}';
      if (processedExpansion.includes(cursorMarker)) {
        processedExpansion = processedExpansion.replace(cursorMarker, '');
      }

      // Split by keyboard actions (join for simplicity)
      const { chunks } = CommandParser.splitTextByKeyboardActions(processedExpansion);
      const finalExpansion = chunks.join('');

      logger.debug('expansion', `Final expansion: "${finalExpansion}"`, context);

      // Check for Google Docs FIRST (special handling required)
      const isGoogleDocs = this.isGoogleDocsEditor(element);
      if (isGoogleDocs) {
        logger.info('expansion', 'Google Docs detected, using specialized handler', context);
        const success = await this.googleDocsReplace(element, triggerToRemove, finalExpansion);
        if (success) {
          logger.info('tier', 'GoogleDocs tier succeeded', { ...context, tier: 'GoogleDocs' });
          return true;
        } else {
          logger.warn('tier', 'GoogleDocs tier failed, falling back to standard tiers', { ...context, tier: 'GoogleDocs' });
        }
      }

      // Check for CKEditor
      const isCKEditor = CKEditorHandler.detect(element);
      if (isCKEditor) {
        logger.info('expansion', 'CKEditor detected, using specialized handler', context);
        const success = await CKEditorHandler.replace(element, triggerToRemove, finalExpansion);
        if (success) {
          logger.info('tier', 'Tier5-CKEditor succeeded', { ...context, tier: 'CKEditor' });
          return true;
        } else {
          logger.warn('tier', 'Tier5-CKEditor failed, falling back to standard tiers', { ...context, tier: 'CKEditor' });
        }
      }

      // Detect framework
      const framework = this.detectFramework(element);
      logger.debug('expansion', `Detected framework: ${framework}`, { ...context, tier: framework });

      // Try tiers in order - use triggerToRemove (actual typed text)
      const tiers = [
        { name: 'Tier0-DirectManipulation', fn: () => this.tier0DirectManipulation(element, triggerToRemove, finalExpansion) },
        { name: 'Tier1-ExecCommand', fn: () => this.tier1ExecCommand(element, triggerToRemove, finalExpansion) },
        { name: 'Tier2-AggressiveEvents', fn: () => this.tier2AggressiveEvents(element, triggerToRemove, finalExpansion, framework) },
        { name: 'Tier3-Clipboard', fn: () => this.tier3Clipboard(element, triggerToRemove, finalExpansion) },
        { name: 'Tier4-Keyboard', fn: () => this.tier4Keyboard(element, triggerToRemove, finalExpansion) }
      ];

      const failedTiers: string[] = [];

      for (const tier of tiers) {
        logger.debug('tier', `Trying ${tier.name}`, { ...context, tier: tier.name });

        const success = await tier.fn();

        if (success) {
          // Verify it worked - check expansion inserted AND trigger removed
          await this.delay(50); // Give DOM time to update
          const verified = this.verifyInsertion(element, finalExpansion, triggerToRemove);

          if (verified) {
            logger.info('tier', `${tier.name} succeeded`, { ...context, tier: tier.name });
            return true;
          } else {
            logger.warn('tier', `${tier.name} reported success but verification failed`, { ...context, tier: tier.name });
            failedTiers.push(`${tier.name} (verification failed)`);
          }
        } else {
          failedTiers.push(tier.name);
        }
      }

      // All tiers failed - log detailed error
      const errorContext = {
        ...context,
        error: `All ${failedTiers.length} tiers failed: ${failedTiers.join(', ')}`,
        retryCount
      };

      logger.error('fail', 'All replacement tiers failed', errorContext);

      // Retry logic - wait 200ms and try once more
      if (retryCount === 0) {
        logger.info('retry', 'Waiting 200ms before retry attempt', errorContext);
        await this.delay(200);

        // Verify element is still valid before retry
        if (!document.contains(element)) {
          logger.error('retry', 'Element removed from document before retry', errorContext);
          return false;
        }

        logger.info('retry', 'Attempting retry (1/1)', errorContext);
        return await this.replace(element, trigger, expansion, caseTransform, typedTrigger, 1);
      }

      // Final failure after retry
      logger.error('fail', 'Final failure after retry', errorContext);
      console.error('TextBlitz: ❌ All replacement tiers failed after retry');
      console.error('Copy debug info with: logger.formatForGitHub() in console');

      return false;
    } catch (error) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? error.message : String(error),
        retryCount
      };
      logger.error('fail', 'Fatal error in replace method', errorContext);
      console.error('TextBlitz: Fatal error in replace:', error);
      return false;
    }
  }

  // Google Docs detection
  private static isGoogleDocsEditor(element: HTMLElement): boolean {
    // Check if we're in Google Docs by hostname
    if (window.location.hostname.includes('docs.google.com')) {
      return true;
    }

    // Check for Google Docs-specific class names
    if (element.classList.contains('kix-cursor') ||
        element.closest('.kix-appview-editor') ||
        document.querySelector('.kix-appview-editor')) {
      return true;
    }

    return false;
  }

  // Google Docs-specific replacement handler with improved reliability
  private static async googleDocsReplace(
    element: HTMLElement,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: Google Docs handler - starting');

      // Focus the editor
      element.focus();
      await this.delay(30); // Give focus time to settle

      // CRITICAL: Get initial text content to verify trigger is present
      const initialText = this.getElementText(element);
      if (!initialText.endsWith(trigger)) {
        this.log('TextBlitz: Google Docs - trigger not found at end of text');
        return false;
      }

      // Delete trigger using backspace simulation with verification
      for (let i = 0; i < trigger.length; i++) {
        document.execCommand('delete', false);
      }

      // Wait for DOM to update after deletion
      await this.delay(100);

      // Verify trigger was actually removed - retry up to 3 times if needed
      let deletionRetries = 0;
      let textAfterDelete = this.getElementText(element);

      while (textAfterDelete.endsWith(trigger) && deletionRetries < 3) {
        this.log(`TextBlitz: Google Docs deletion retry ${deletionRetries + 1}/3`);

        // Try alternate deletion strategy - select and delete
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          let { startContainer, startOffset } = range;

          // Navigate to text node if needed
          if (startContainer.nodeType !== Node.TEXT_NODE && startContainer.childNodes.length > 0) {
            const childIndex = Math.min(startOffset, startContainer.childNodes.length - 1);
            const childNode = startContainer.childNodes[childIndex];
            if (childNode && childNode.nodeType === Node.TEXT_NODE) {
              startContainer = childNode;
              startOffset = (childNode as Text).textContent?.length || 0;
            }
          }

          if (startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = startContainer as Text;
            const text = textNode.textContent || '';
            const beforeCursor = text.substring(0, startOffset);

            if (beforeCursor.endsWith(trigger)) {
              // Select trigger and delete
              const newRange = document.createRange();
              newRange.setStart(textNode, startOffset - trigger.length);
              newRange.setEnd(textNode, startOffset);
              selection.removeAllRanges();
              selection.addRange(newRange);
              document.execCommand('delete', false);
              await this.delay(100);
            }
          }
        }

        deletionRetries++;
        textAfterDelete = this.getElementText(element);
      }

      // Final check - if trigger still present, fail
      if (textAfterDelete.endsWith(trigger)) {
        this.log('TextBlitz: Google Docs deletion failed after retries');
        return false;
      }

      // Wait before insertion to let Google Docs settle
      await this.delay(50);

      // Insert expansion text using insertText
      const inserted = document.execCommand('insertText', false, expansion);

      if (!inserted) {
        this.log('TextBlitz: Google Docs insertText failed');
        return false;
      }

      // CRITICAL: Wait longer for Google Docs to process the insertion
      // This prevents the delayed re-trigger issue
      await this.delay(150);

      // Final verification - check expansion is present AND trigger is gone
      const finalText = this.getElementText(element);
      const checkText = expansion.substring(0, Math.min(10, expansion.length));

      if (!finalText.includes(checkText)) {
        this.log('TextBlitz: Google Docs insertion verification failed - expansion not found');
        return false;
      }

      if (finalText.endsWith(trigger)) {
        this.log('TextBlitz: Google Docs verification failed - trigger reappeared');
        return false;
      }

      this.log('TextBlitz: ✅ Google Docs handler succeeded');
      return true;
    } catch (error) {
      this.log('TextBlitz: Google Docs handler failed:', error);
      return false;
    }
  }

  static isValidInputElement(element: HTMLElement): boolean {
    this.log('TextBlitz: isValidInputElement check on', element.tagName,
      element instanceof HTMLInputElement ? `type=${(element as HTMLInputElement).type}` : '');

    // Skip password fields
    if (element instanceof HTMLInputElement && element.type === 'password') {
      this.log('TextBlitz: Skipping password field');
      return false;
    }

    // Skip hidden fields
    if (element instanceof HTMLInputElement && element.type === 'hidden') {
      this.log('TextBlitz: Skipping hidden field');
      return false;
    }

    // Skip incompatible input types
    if (element instanceof HTMLInputElement) {
      const incompatibleTypes = ['number', 'date', 'time', 'color', 'range', 'file', 'datetime-local', 'month', 'week'];
      if (incompatibleTypes.includes(element.type)) {
        this.log('TextBlitz: Skipping incompatible input type:', element.type);
        return false;
      }
    }

    // Accept inputs, textareas, and contenteditable
    const isValid = (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element.isContentEditable
    );

    this.log('TextBlitz: isValidInputElement returning:', isValid);
    return isValid;
  }
}
