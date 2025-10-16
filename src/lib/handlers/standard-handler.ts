import { BaseHandler } from './base-handler';

// Standard handler for regular input/textarea elements
export class StandardHandler extends BaseHandler {
  name = 'Standard';
  priority = 1; // Lowest priority, used as fallback

  canHandle(element: HTMLElement): boolean {
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
  }

  async replace(element: HTMLElement, trigger: string, expansion: string): Promise<boolean> {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return false;
    }

    this.log('Starting standard replacement');

    const value = element.value;
    const cursorPos = element.selectionStart ?? value.length;

    // Find trigger
    const triggerPos = this.findTrigger(value.substring(0, cursorPos), trigger);
    if (!triggerPos) {
      this.log('Trigger not found');
      return false;
    }

    // Build new value
    const beforeTrigger = value.substring(0, triggerPos.start);
    const afterCursor = value.substring(cursorPos);
    const newValue = beforeTrigger + expansion + afterCursor;

    // Set value
    element.value = newValue;

    // Set cursor position
    const newCursorPos = beforeTrigger.length + expansion.length;
    try {
      element.setSelectionRange(newCursorPos, newCursorPos);
    } catch (e) {
      // Some input types don't support selection
    }

    // Dispatch events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Verify
    await this.delay(10);
    return this.verify(element, expansion, trigger);
  }
}
