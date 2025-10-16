import { BaseHandler, KeyboardAction } from './base-handler';

// Handler for contenteditable elements (rich text editors)
export class ContentEditableHandler extends BaseHandler {
  name = 'ContentEditable';
  priority = 3; // Medium priority

  canHandle(element: HTMLElement): boolean {
    return element.isContentEditable;
  }

  async replace(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    cursorOffset?: number,
    chunks?: string[],
    actions?: KeyboardAction[]
  ): Promise<boolean> {
    this.log('Starting contenteditable replacement');

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.log('No selection available');
      return false;
    }

    const range = selection.getRangeAt(0);
    let { startContainer, startOffset } = range;

    // Navigate to text node
    if (startContainer.nodeType !== Node.TEXT_NODE) {
      if (startContainer.childNodes.length > 0) {
        const childIndex = Math.min(startOffset, startContainer.childNodes.length - 1);
        const childNode = startContainer.childNodes[childIndex];
        if (childNode && childNode.nodeType === Node.TEXT_NODE) {
          startContainer = childNode;
          startOffset = (childNode as Text).textContent?.length || 0;
        } else {
          this.log('Could not find text node');
          return false;
        }
      } else {
        this.log('No child nodes');
        return false;
      }
    }

    const textNode = startContainer as Text;
    const text = textNode.textContent || '';
    const beforeCursor = text.substring(0, startOffset);

    // Check for trigger
    if (!beforeCursor.endsWith(trigger)) {
      this.log('Trigger not found before cursor');
      return false;
    }

    // Select trigger
    const newRange = document.createRange();
    const triggerStart = startOffset - trigger.length;
    newRange.setStart(textNode, triggerStart);
    newRange.setEnd(textNode, startOffset);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Delete trigger
    const deleted = document.execCommand('delete', false);
    if (!deleted) {
      this.log('Delete command failed');
      return false;
    }

    // Handle chunked insertion with keyboard actions
    if (chunks && chunks.length > 0 && actions && actions.length > 0) {
      return await this.replaceWithChunks(element, chunks, actions, trigger, expansion, cursorOffset);
    }

    // Insert expansion
    const inserted = document.execCommand('insertText', false, expansion);
    if (!inserted) {
      this.log('InsertText command failed');
      return false;
    }

    // Set cursor position if cursorOffset provided
    if (cursorOffset !== undefined && cursorOffset < expansion.length) {
      await this.setCursorPosition(element, cursorOffset, expansion);
    }

    // Dispatch event
    element.dispatchEvent(new Event('input', { bubbles: true }));

    // Verify
    await this.delay(10);
    return this.verify(element, expansion, trigger);
  }

  // Insert text in chunks with keyboard actions between
  private async replaceWithChunks(
    element: HTMLElement,
    chunks: string[],
    actions: KeyboardAction[],
    trigger: string,
    expansion: string,
    cursorOffset?: number
  ): Promise<boolean> {
    this.log(`Replacing with ${chunks.length} chunks and ${actions.length} actions`);

    let totalInserted = 0;

    // Insert chunks with actions
    for (let i = 0; i < chunks.length; i++) {
      // Skip empty chunks
      if (chunks[i].length === 0 && i < chunks.length - 1) {
        // Execute action and continue
        if (i < actions.length) {
          await this.executeKeyboardAction(element, actions[i]);
        }
        continue;
      }

      const inserted = document.execCommand('insertText', false, chunks[i]);
      if (!inserted) {
        this.log(`Failed to insert chunk ${i}`);
        return false;
      }

      totalInserted += chunks[i].length;
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // Execute keyboard action after this chunk (if exists)
      if (i < actions.length) {
        await this.executeKeyboardAction(element, actions[i]);
      }
    }

    // Apply cursor offset if specified (after all chunks inserted)
    if (cursorOffset !== undefined && cursorOffset < totalInserted) {
      await this.setCursorFromEnd(element, totalInserted - cursorOffset);
    }

    // Verify
    await this.delay(10);
    return this.verify(element, expansion, trigger);
  }

  // Move cursor back from current position
  private async setCursorFromEnd(element: HTMLElement, charsFromEnd: number): Promise<void> {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      const { startContainer, startOffset } = range;

      if (startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = startContainer as Text;
        const newOffset = Math.max(0, startOffset - charsFromEnd);

        range.setStart(textNode, newOffset);
        range.setEnd(textNode, newOffset);
        selection.removeAllRanges();
        selection.addRange(range);

        this.log(`Moved cursor back ${charsFromEnd} chars to position ${newOffset}`);
      }
    } catch (error) {
      this.log('Failed to move cursor:', error);
    }
  }

  // Set cursor position in contenteditable
  private async setCursorPosition(element: HTMLElement, offset: number, expansion: string): Promise<void> {
    this.log(`Setting cursor position to offset ${offset}`);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      const { startContainer } = range;

      // Find the text node containing the expansion
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = startContainer as Text;
        const text = textNode.textContent || '';

        // Move cursor back from end
        const newOffset = text.length - (expansion.length - offset);
        if (newOffset >= 0 && newOffset <= text.length) {
          range.setStart(textNode, newOffset);
          range.setEnd(textNode, newOffset);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } catch (error) {
      this.log('Failed to set cursor position:', error);
    }
  }
}
