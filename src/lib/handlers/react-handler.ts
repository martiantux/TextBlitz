import { BaseHandler } from './base-handler';
import { SiteDetector } from '../site-detector';

// React-specific handler for controlled inputs (ChatGPT, modern React apps)
export class ReactHandler extends BaseHandler {
  name = 'React';
  priority = 5; // High priority for React apps

  canHandle(element: HTMLElement): boolean {
    return SiteDetector.isReact(element) &&
           (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement);
  }

  async replace(element: HTMLElement, trigger: string, expansion: string): Promise<boolean> {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return false;
    }

    this.log('Starting React-specific replacement');

    const value = element.value;
    const cursorPos = element.selectionStart ?? value.length;

    // Find trigger using multiple strategies
    let triggerStart = -1;
    let triggerEnd = -1;

    // Strategy 1: Before cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    if (textBeforeCursor.endsWith(trigger)) {
      triggerStart = cursorPos - trigger.length;
      triggerEnd = cursorPos;
    }
    // Strategy 2: At end
    else if (value.endsWith(trigger)) {
      triggerStart = value.length - trigger.length;
      triggerEnd = value.length;
    }
    // Strategy 3: Last occurrence
    else {
      triggerStart = value.lastIndexOf(trigger);
      if (triggerStart !== -1) {
        triggerEnd = triggerStart + trigger.length;
      }
    }

    if (triggerStart === -1) {
      this.log('Trigger not found');
      return false;
    }

    // Build new value
    const beforeTrigger = value.substring(0, triggerStart);
    const afterTrigger = value.substring(triggerEnd);
    const newValue = beforeTrigger + expansion + afterTrigger;

    // Get native setters (bypasses React's controlled input)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    // Set value using native setter
    if (element instanceof HTMLInputElement && nativeInputValueSetter) {
      nativeInputValueSetter.call(element, newValue);
    } else if (element instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(element, newValue);
    } else {
      element.value = newValue;
    }

    // Clear React's value tracker to force reconciliation
    const tracker = (element as any)._valueTracker;
    if (tracker) {
      tracker.setValue('');
    }

    // Dispatch events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Set cursor
    const newCursorPos = beforeTrigger.length + expansion.length;
    try {
      element.setSelectionRange(newCursorPos, newCursorPos);
    } catch (e) {
      // Ignore
    }

    // Verify
    await this.delay(10);
    return this.verify(element, expansion, trigger);
  }
}
