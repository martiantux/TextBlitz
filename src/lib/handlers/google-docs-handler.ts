import { BaseHandler } from './base-handler';
import { SiteDetector } from '../site-detector';

// Google Docs-specific handler with delays and retry logic
export class GoogleDocsHandler extends BaseHandler {
  name = 'GoogleDocs';
  priority = 10; // Highest priority for Google Docs

  canHandle(element: HTMLElement): boolean {
    return SiteDetector.isGoogleDocs(element);
  }

  async replace(element: HTMLElement, trigger: string, expansion: string): Promise<boolean> {
    this.log('Starting Google Docs replacement');

    // Focus element
    element.focus();
    await this.delay(50);

    // Verify trigger is present
    const initialText = this.getElementText(element);
    if (!initialText.endsWith(trigger)) {
      this.log('Trigger not found at end of text');
      return false;
    }

    // Delete trigger character by character
    for (let i = 0; i < trigger.length; i++) {
      document.execCommand('delete', false);
    }

    await this.delay(100);

    // Verify deletion with retries
    let retries = 0;
    let textAfterDelete = this.getElementText(element);

    while (textAfterDelete.endsWith(trigger) && retries < 3) {
      this.log(`Deletion retry ${retries + 1}/3`);

      // Try selection-based deletion
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let { startContainer, startOffset } = range;

        // Navigate to text node
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

      retries++;
      textAfterDelete = this.getElementText(element);
    }

    // Check deletion succeeded
    if (textAfterDelete.endsWith(trigger)) {
      this.log('Deletion failed after retries');
      return false;
    }

    // Wait before insertion
    await this.delay(50);

    // Insert expansion
    const inserted = document.execCommand('insertText', false, expansion);
    if (!inserted) {
      this.log('insertText failed');
      return false;
    }

    // CRITICAL: Wait for Google Docs to process
    await this.delay(200);

    // Verify
    return this.verify(element, expansion, trigger);
  }
}
