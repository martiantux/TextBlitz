import { BaseHandler } from './base-handler';

// Handler for contenteditable elements (rich text editors)
export class ContentEditableHandler extends BaseHandler {
  name = 'ContentEditable';
  priority = 3; // Medium priority

  canHandle(element: HTMLElement): boolean {
    return element.isContentEditable;
  }

  async replace(element: HTMLElement, trigger: string, expansion: string): Promise<boolean> {
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

    // Insert expansion
    const inserted = document.execCommand('insertText', false, expansion);
    if (!inserted) {
      this.log('InsertText command failed');
      return false;
    }

    // Dispatch event
    element.dispatchEvent(new Event('input', { bubbles: true }));

    // Verify
    await this.delay(10);
    return this.verify(element, expansion, trigger);
  }
}
