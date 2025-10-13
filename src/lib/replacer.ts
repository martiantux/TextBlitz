import { Snippet } from './types';
import { CommandParser } from './command-parser';

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
    expansion: string
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

      // Process commands (date, time, clipboard) before cursor parsing
      const processedExpansion = await CommandParser.processCommands(expansion);

      // Extract keyboard actions before parsing cursor
      const { text: textWithoutKeyboard, actions } = CommandParser.extractKeyboardActions(processedExpansion);

      // Parse {cursor} from expansion
      const { text: cleanExpansion, cursorOffset } = this.parseCursor(textWithoutKeyboard);

      // Set the new value
      element.value = textBefore + cleanExpansion + textAfter;

      // Position cursor at {cursor} location or end of expanded text
      // Some input types don't support setSelectionRange, wrap in try/catch
      const newPos = textBefore.length + cursorOffset;
      try {
        element.setSelectionRange(newPos, newPos);
      } catch (e) {
        // Input type doesn't support selection (email, number, etc.) - cursor will be at end anyway
      }

      // Trigger input event so frameworks like React notice the change
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);

      // Execute keyboard actions after text insertion
      if (actions.length > 0) {
        await this.executeKeyboardActions(element, actions);
      }

      this.log('TextBlitz: New value:', element.value);
      this.log('TextBlitz: ✅ Replacement successful');
      return true;
    } catch (error) {
      console.error('TextBlitz: Error replacing in input', error);
      return false;
    }
  }

  static async replaceInContentEditable(
    element: HTMLElement,
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;

      const range = selection.getRangeAt(0);
      const { startContainer, startOffset } = range;

      // Only handle text nodes for now
      if (startContainer.nodeType !== Node.TEXT_NODE) return false;

      const textNode = startContainer as Text;
      const text = textNode.textContent || '';

      // Check if the trigger is right before the cursor
      const beforeCursor = text.substring(0, startOffset);
      if (!beforeCursor.endsWith(trigger)) return false;

      // Calculate the position to start deleting from
      const deleteStart = startOffset - trigger.length;

      // Process commands (date, time, clipboard) before cursor parsing
      const processedExpansion = await CommandParser.processCommands(expansion);

      // Extract keyboard actions before parsing cursor
      const { text: textWithoutKeyboard, actions } = CommandParser.extractKeyboardActions(processedExpansion);

      // Parse {cursor} from expansion
      const { text: cleanExpansion, cursorOffset } = this.parseCursor(textWithoutKeyboard);

      // Create new text content
      const newText = text.substring(0, deleteStart) + cleanExpansion + text.substring(startOffset);
      textNode.textContent = newText;

      // Set cursor at {cursor} location or end of expansion
      const newOffset = deleteStart + cursorOffset;
      range.setStart(textNode, newOffset);
      range.setEnd(textNode, newOffset);
      selection.removeAllRanges();
      selection.addRange(range);

      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);

      // Execute keyboard actions after text insertion
      if (actions.length > 0) {
        await this.executeKeyboardActions(element, actions);
      }

      return true;
    } catch (error) {
      console.error('TextBlitz: Error replacing in contenteditable', error);
      return false;
    }
  }

  static async replace(element: HTMLElement, trigger: string, expansion: string): Promise<boolean> {
    // Check if it's a regular input or textarea
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return await this.replaceInInput(element, trigger, expansion);
    }

    // Check if it's contenteditable
    if (element.isContentEditable) {
      return await this.replaceInContentEditable(element, trigger, expansion);
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
