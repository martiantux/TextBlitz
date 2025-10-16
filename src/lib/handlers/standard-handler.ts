import { BaseHandler, KeyboardAction } from './base-handler';

// Standard handler for regular input/textarea elements
export class StandardHandler extends BaseHandler {
  name = 'Standard';
  priority = 1; // Lowest priority, used as fallback

  canHandle(element: HTMLElement): boolean {
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
  }

  async replace(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    cursorOffset?: number,
    chunks?: string[],
    actions?: KeyboardAction[]
  ): Promise<boolean> {
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

    const beforeTrigger = value.substring(0, triggerPos.start);
    const afterCursor = value.substring(cursorPos);

    // Handle chunked insertion with keyboard actions
    if (chunks && chunks.length > 0 && actions && actions.length > 0) {
      return await this.replaceWithChunks(element, beforeTrigger, afterCursor, chunks, actions, trigger, expansion);
    }

    // Standard replacement without chunks
    const newValue = beforeTrigger + expansion + afterCursor;
    element.value = newValue;

    // Set cursor position (use cursorOffset if provided, otherwise end of expansion)
    const finalCursorPos = beforeTrigger.length + (cursorOffset ?? expansion.length);
    try {
      element.setSelectionRange(finalCursorPos, finalCursorPos);
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

  // Insert text in chunks with keyboard actions between
  private async replaceWithChunks(
    element: HTMLInputElement | HTMLTextAreaElement,
    beforeTrigger: string,
    afterCursor: string,
    chunks: string[],
    actions: KeyboardAction[],
    trigger: string,
    expansion: string
  ): Promise<boolean> {
    this.log(`Replacing with ${chunks.length} chunks and ${actions.length} actions`);

    let currentValue = beforeTrigger;

    // Insert chunks with actions
    for (let i = 0; i < chunks.length; i++) {
      currentValue += chunks[i];

      // Set value
      element.value = currentValue + afterCursor;
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // Set cursor at end of current chunk
      const cursorPos = currentValue.length;
      try {
        element.setSelectionRange(cursorPos, cursorPos);
      } catch (e) {
        // Ignore
      }

      // Execute keyboard action after this chunk (if exists)
      if (i < actions.length) {
        await this.executeKeyboardAction(element, actions[i]);
      }
    }

    // Final event
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Verify
    await this.delay(10);
    return this.verify(element, expansion, trigger);
  }
}
