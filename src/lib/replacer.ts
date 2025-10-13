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

  // Parse {cursor} from expansion and return clean text + cursor offset
  private static parseCursor(expansion: string): { text: string; cursorOffset: number } {
    const cursorMarker = '{cursor}';
    const index = expansion.indexOf(cursorMarker);

    if (index === -1) {
      // No {cursor} found, cursor goes at end
      return { text: expansion, cursorOffset: expansion.length };
    }

    // Remove {cursor} marker and calculate offset
    const text = expansion.slice(0, index) + expansion.slice(index + cursorMarker.length);
    return { text, cursorOffset: index };
  }

  // Dispatch keyboard event
  private static dispatchKey(element: HTMLElement, key: string) {
    const options = {
      key,
      code: key === 'Enter' ? 'Enter' : key === 'Tab' ? 'Tab' : key,
      bubbles: true,
      cancelable: true,
    };

    element.dispatchEvent(new KeyboardEvent('keydown', options));
    element.dispatchEvent(new KeyboardEvent('keypress', options));
    element.dispatchEvent(new KeyboardEvent('keyup', options));
  }

  // Execute keyboard actions sequentially with delays
  private static async executeKeyboardActions(
    element: HTMLElement,
    actions: Array<{ type: 'enter' | 'tab' | 'delay'; options?: string; position: number }>
  ) {
    for (const action of actions) {
      if (action.type === 'delay') {
        const ms = CommandParser.parseDelayMs(action.options);
        await new Promise(resolve => setTimeout(resolve, ms));
      } else if (action.type === 'enter') {
        this.dispatchKey(element, 'Enter');
      } else if (action.type === 'tab') {
        this.dispatchKey(element, 'Tab');
      }
    }
  }

  static async replaceInInput(
    element: HTMLInputElement | HTMLTextAreaElement,
    trigger: string,
    expansion: string,
    caseTransform?: CaseTransform
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: replaceInInput called');
      this.log('TextBlitz: Element type:', element.tagName, element instanceof HTMLInputElement ? `(input type="${(element as HTMLInputElement).type}")` : '(textarea)');

      // Some input types (email, number, date) don't support selectionStart per HTML spec
      // Fall back to value.length (cursor is at end during input events)
      const cursorPos = element.selectionStart ?? element.value.length;

      const value = element.value;
      this.log('TextBlitz: Current value:', value, 'cursor at:', cursorPos);
      this.log('TextBlitz: Trigger length:', trigger.length, 'trigger:', trigger);

      // Check if trigger is actually present before cursor
      const textBeforeCursor = value.substring(0, cursorPos);
      this.log('TextBlitz: Text before cursor:', textBeforeCursor);

      if (!textBeforeCursor.endsWith(trigger)) {
        console.error('TextBlitz: Trigger not found before cursor!');
        console.error('TextBlitz: Expected to find:', trigger, 'at end of:', textBeforeCursor);
        return false;
      }

      const textBefore = value.substring(0, cursorPos - trigger.length);
      const textAfter = value.substring(cursorPos);

      this.log('TextBlitz: Before:', textBefore, '| After:', textAfter);
      this.log('TextBlitz: Replacing trigger:', trigger, 'with:', expansion);

      // Process commands (date, time, clipboard) first
      let processedExpansion = await CommandParser.processCommands(expansion);

      // Apply case transformation if specified
      if (caseTransform && caseTransform !== 'none') {
        processedExpansion = CaseTransformer.transform(processedExpansion, caseTransform, trigger);
      }

      // Parse {cursor} from expansion
      const { text: textWithCursor, cursorOffset } = this.parseCursor(processedExpansion);

      // Split text by keyboard actions (enter, tab, delay)
      const { chunks, actions } = CommandParser.splitTextByKeyboardActions(textWithCursor);

      // Insert text in chunks with actions between them
      let currentValue = textBefore;
      let insertedLength = 0;
      let finalCursorPos = textBefore.length + cursorOffset;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        currentValue += chunk;
        insertedLength += chunk.length;

        // Update element value
        element.value = currentValue + textAfter;

        // Trigger input event
        const inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);

        // Execute action after this chunk (if any)
        if (i < actions.length) {
          const action = actions[i];
          if (action.type === 'delay') {
            const ms = CommandParser.parseDelayMs(action.options);
            await new Promise(resolve => setTimeout(resolve, ms));
          } else if (action.type === 'enter') {
            this.dispatchKey(element, 'Enter');
          } else if (action.type === 'tab') {
            this.dispatchKey(element, 'Tab');
          }
        }
      }

      // Position cursor at {cursor} location or end of expanded text
      try {
        element.setSelectionRange(finalCursorPos, finalCursorPos);
      } catch (e) {
        // Input type doesn't support selection
      }

      this.log('TextBlitz: New value:', element.value);
      this.log('TextBlitz: ✅ Replacement successful');
      return true;
    } catch (error) {
      console.error('TextBlitz: Error replacing in input', error);
      return false;
    }
  }

  // Get all text before cursor in contenteditable (handles multiple text nodes)
  private static getTextBeforeCursor(): { text: string; nodes: Text[]; lastNode: Text; offset: number } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const { startContainer, startOffset } = range;

    // Find the contenteditable root
    let editableRoot: Node | null = startContainer;
    while (editableRoot && editableRoot.nodeType !== Node.ELEMENT_NODE) {
      editableRoot = editableRoot.parentNode;
    }
    if (!editableRoot || !(editableRoot as HTMLElement).isContentEditable) {
      // Walk up to find contenteditable
      let parent = startContainer.parentElement;
      while (parent && !parent.isContentEditable) {
        parent = parent.parentElement;
      }
      editableRoot = parent;
    }

    if (!editableRoot) return null;

    // Collect all text nodes before cursor
    const textNodes: Text[] = [];
    let currentNode: Node | null = null;
    let found = false;

    const walker = document.createTreeWalker(
      editableRoot,
      NodeFilter.SHOW_TEXT,
      null
    );

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node === startContainer) {
        textNodes.push(node);
        currentNode = node;
        found = true;
        break;
      }
      textNodes.push(node);
    }

    if (!found || !currentNode) return null;

    // Build text from all nodes
    let fullText = '';
    for (let i = 0; i < textNodes.length - 1; i++) {
      fullText += textNodes[i].textContent || '';
    }
    // Add partial text from last node
    fullText += (currentNode.textContent || '').substring(0, startOffset);

    return {
      text: fullText,
      nodes: textNodes,
      lastNode: currentNode as Text,
      offset: startOffset
    };
  }

  static async replaceInContentEditable(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    caseTransform?: CaseTransform
  ): Promise<boolean> {
    try {
      this.log('TextBlitz: replaceInContentEditable called');

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        this.log('TextBlitz: No selection available');
        return false;
      }

      const range = selection.getRangeAt(0);
      const { startContainer, startOffset } = range;

      // Try simple approach first (single text node)
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = startContainer as Text;
        const text = textNode.textContent || '';
        const beforeCursor = text.substring(0, startOffset);

        if (beforeCursor.endsWith(trigger)) {
          this.log('TextBlitz: Using simple text node replacement');
          return await this.replaceInSimpleTextNode(
            element,
            textNode,
            startOffset,
            trigger,
            expansion,
            caseTransform
          );
        }
      }

      // Try multi-node approach (complex contenteditable)
      this.log('TextBlitz: Trying multi-node replacement');
      const cursorInfo = this.getTextBeforeCursor();
      if (!cursorInfo) {
        this.log('TextBlitz: Could not get text before cursor');
        return false;
      }

      const { text, lastNode, offset } = cursorInfo;
      this.log('TextBlitz: Text before cursor:', text);

      if (!text.endsWith(trigger)) {
        this.log('TextBlitz: Trigger not found at end of text');
        return false;
      }

      // Use execCommand for better compatibility with rich editors
      this.log('TextBlitz: Using execCommand approach');
      return await this.replaceWithExecCommand(
        element,
        lastNode,
        offset,
        trigger,
        expansion,
        caseTransform
      );
    } catch (error) {
      console.error('TextBlitz: Error replacing in contenteditable', error);
      return false;
    }
  }

  // Simple replacement for single text node (most textareas, simple contenteditable)
  private static async replaceInSimpleTextNode(
    element: HTMLElement,
    textNode: Text,
    cursorOffset: number,
    trigger: string,
    expansion: string,
    caseTransform?: CaseTransform
  ): Promise<boolean> {
    try {
      const text = textNode.textContent || '';
      const deleteStart = cursorOffset - trigger.length;
      const textAfter = text.substring(cursorOffset);

      // Process commands
      let processedExpansion = await CommandParser.processCommands(expansion);
      if (caseTransform && caseTransform !== 'none') {
        processedExpansion = CaseTransformer.transform(processedExpansion, caseTransform, trigger);
      }

      const { text: textWithCursor, cursorOffset: finalCursorOffset } = this.parseCursor(processedExpansion);
      const { chunks, actions } = CommandParser.splitTextByKeyboardActions(textWithCursor);

      // Insert text
      let currentText = text.substring(0, deleteStart);
      for (let i = 0; i < chunks.length; i++) {
        currentText += chunks[i];
        textNode.textContent = currentText + textAfter;

        // Dispatch input event with more properties for framework compatibility
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: chunks[i]
        });
        element.dispatchEvent(inputEvent);

        if (i < actions.length) {
          await this.executeKeyboardAction(element, actions[i]);
        }
      }

      // Set cursor position
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        const newCursorPos = deleteStart + finalCursorOffset;
        range.setStart(textNode, Math.min(newCursorPos, textNode.textContent?.length || 0));
        range.setEnd(textNode, Math.min(newCursorPos, textNode.textContent?.length || 0));
        selection.removeAllRanges();
        selection.addRange(range);
      }

      return true;
    } catch (error) {
      this.log('TextBlitz: Error in simple text node replacement', error);
      return false;
    }
  }

  // Replacement using execCommand (better for Gmail, Docs, etc.)
  private static async replaceWithExecCommand(
    element: HTMLElement,
    lastNode: Text,
    cursorOffset: number,
    trigger: string,
    expansion: string,
    caseTransform?: CaseTransform
  ): Promise<boolean> {
    try {
      // Process expansion
      let processedExpansion = await CommandParser.processCommands(expansion);
      if (caseTransform && caseTransform !== 'none') {
        processedExpansion = CaseTransformer.transform(processedExpansion, caseTransform, trigger);
      }

      const { text: textWithCursor, cursorOffset: finalCursorOffset } = this.parseCursor(processedExpansion);
      const { chunks } = CommandParser.splitTextByKeyboardActions(textWithCursor);
      const fullText = chunks.join('');

      // Select the trigger text to delete it
      const selection = window.getSelection();
      if (!selection) return false;

      const range = document.createRange();

      // Calculate where trigger starts
      const textBefore = (lastNode.textContent || '').substring(0, cursorOffset);
      const triggerStart = cursorOffset - trigger.length;

      // Select trigger
      range.setStart(lastNode, triggerStart);
      range.setEnd(lastNode, cursorOffset);
      selection.removeAllRanges();
      selection.addRange(range);

      // Delete trigger and insert expansion using execCommand (better compatibility)
      document.execCommand('delete', false);
      document.execCommand('insertText', false, fullText);

      // Dispatch input event for framework reactivity
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        inputType: 'insertText',
        data: fullText
      });
      element.dispatchEvent(inputEvent);

      this.log('TextBlitz: ✅ execCommand replacement successful');
      return true;
    } catch (error) {
      this.log('TextBlitz: Error in execCommand replacement', error);
      return false;
    }
  }

  // Helper to execute keyboard actions
  private static async executeKeyboardAction(
    element: HTMLElement,
    action: { type: 'enter' | 'tab' | 'delay'; options?: string }
  ): Promise<void> {
    if (action.type === 'delay') {
      const ms = CommandParser.parseDelayMs(action.options);
      await new Promise(resolve => setTimeout(resolve, ms));
    } else if (action.type === 'enter') {
      this.dispatchKey(element, 'Enter');
    } else if (action.type === 'tab') {
      this.dispatchKey(element, 'Tab');
    }
  }

  static async replace(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    caseTransform?: CaseTransform
  ): Promise<boolean> {
    // Check if it's a regular input or textarea
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return await this.replaceInInput(element, trigger, expansion, caseTransform);
    }

    // Check if it's contenteditable
    if (element.isContentEditable) {
      return await this.replaceInContentEditable(element, trigger, expansion, caseTransform);
    }

    return false;
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
