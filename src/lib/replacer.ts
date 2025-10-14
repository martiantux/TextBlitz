import { Snippet, CaseTransform } from './types';
import { CommandParser } from './command-parser';
import { CaseTransformer } from './case-transform';

export class TextReplacer {
  private static debugMode = false;

  static setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
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

  // Verify that insertion actually happened
  private static verifyInsertion(element: HTMLElement, expectedText: string): boolean {
    const actual = this.getElementText(element);
    // Check if expansion is present (check first 10 chars to be safe)
    const checkText = expectedText.substring(0, Math.min(10, expectedText.length));
    return actual.includes(checkText);
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
      const textBefore = value.substring(0, cursorPos - trigger.length);
      const textAfter = value.substring(cursorPos);

      // Set value via native descriptor (React detection)
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      const newValue = textBefore + expansion + textAfter;

      if (nativeValueSetter) {
        nativeValueSetter.call(element, newValue);
      } else {
        element.value = newValue;
      }

      // React-specific: trigger _valueTracker
      const tracker = (element as any)._valueTracker;
      if (tracker) {
        tracker.setValue(''); // Force React to notice change
      }

      // Dispatch comprehensive events
      const events = [
        new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: expansion }),
        new Event('change', { bubbles: true }),
        new InputEvent('textInput', { bubbles: true, data: expansion }),
        new Event('keyup', { bubbles: true }),
      ];

      for (const event of events) {
        element.dispatchEvent(event);
      }

      // Set cursor
      const newCursorPos = textBefore.length + expansion.length;
      try {
        element.setSelectionRange(newCursorPos, newCursorPos);
      } catch (e) {
        // Ignore
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

  // MAIN REPLACE METHOD - Try all tiers
  static async replace(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    caseTransform?: CaseTransform
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: === Starting Replacement ===');
      this.log('TextBlitz: Element:', element.tagName, element.className);

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

      this.log('TextBlitz: Final expansion:', finalExpansion);

      // Detect framework
      const framework = this.detectFramework(element);
      this.log('TextBlitz: Detected framework:', framework);

      // Try tiers in order
      const tiers = [
        { name: 'DirectManipulation', fn: () => this.tier0DirectManipulation(element, trigger, finalExpansion) },
        { name: 'ExecCommand', fn: () => this.tier1ExecCommand(element, trigger, finalExpansion) },
        { name: 'AggressiveEvents', fn: () => this.tier2AggressiveEvents(element, trigger, finalExpansion, framework) },
        { name: 'Clipboard', fn: () => this.tier3Clipboard(element, trigger, finalExpansion) },
        { name: 'Keyboard', fn: () => this.tier4Keyboard(element, trigger, finalExpansion) }
      ];

      for (const tier of tiers) {
        const success = await tier.fn();

        if (success) {
          // Verify it worked
          await this.delay(50); // Give DOM time to update
          const verified = this.verifyInsertion(element, finalExpansion);

          if (verified) {
            this.log(`TextBlitz: ✅ ${tier.name} succeeded`);
            return true;
          } else {
            this.log(`TextBlitz: ⚠️ ${tier.name} reported success but verification failed, trying next tier...`);
          }
        }
      }

      console.error('TextBlitz: ❌ All replacement tiers failed');
      return false;
    } catch (error) {
      console.error('TextBlitz: Fatal error in replace:', error);
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
