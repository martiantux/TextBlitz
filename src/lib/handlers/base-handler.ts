// Keyboard action types
export interface KeyboardAction {
  type: 'enter' | 'tab' | 'delay' | 'key';
  options?: string;
}

// Base interface for all site-specific handlers
export interface ReplacementHandler {
  name: string;
  priority: number; // Higher = try first
  canHandle(element: HTMLElement): boolean;
  replace(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    cursorOffset?: number,
    chunks?: string[],
    actions?: KeyboardAction[]
  ): Promise<boolean>;
}

export abstract class BaseHandler implements ReplacementHandler {
  abstract name: string;
  abstract priority: number;
  protected debugMode = false;

  abstract canHandle(element: HTMLElement): boolean;
  abstract replace(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    cursorOffset?: number,
    chunks?: string[],
    actions?: KeyboardAction[]
  ): Promise<boolean>;

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  protected log(...args: any[]): void {
    if (this.debugMode) {
      console.log(`[${this.name}]`, ...args);
    }
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get element text content
  protected getElementText(element: HTMLElement): string {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }
    return element.textContent || '';
  }

  // Find trigger in text backwards from cursor
  protected findTrigger(text: string, trigger: string): { start: number; end: number } | null {
    // Try end of text first
    if (text.endsWith(trigger)) {
      return {
        start: text.length - trigger.length,
        end: text.length
      };
    }

    // Try last occurrence
    const lastIndex = text.lastIndexOf(trigger);
    if (lastIndex !== -1) {
      return {
        start: lastIndex,
        end: lastIndex + trigger.length
      };
    }

    return null;
  }

  // Verify replacement worked
  protected verify(element: HTMLElement, expansion: string, trigger: string): boolean {
    const text = this.getElementText(element);

    // Check expansion is present
    const expansionCheck = expansion.substring(0, Math.min(10, expansion.length));
    if (!text.includes(expansionCheck)) {
      this.log('Verification failed: expansion not found');
      return false;
    }

    // Check trigger is gone
    if (text.endsWith(trigger)) {
      this.log('Verification failed: trigger still present');
      return false;
    }

    return true;
  }

  // Execute keyboard action
  protected async executeKeyboardAction(element: HTMLElement, action: KeyboardAction): Promise<void> {
    switch (action.type) {
      case 'enter':
        await this.executeEnter(element);
        break;
      case 'tab':
        await this.executeTab(element);
        break;
      case 'delay':
        await this.executeDelay(action.options);
        break;
      case 'key':
        await this.executeKey(element, action.options);
        break;
    }
  }

  // Execute {enter} command
  private async executeEnter(element: HTMLElement): Promise<void> {
    this.log('Executing {enter}');

    // For textareas and contenteditable, insert newline
    if (element instanceof HTMLTextAreaElement || element.isContentEditable) {
      const newlineEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(newlineEvent);
    }
    // For other inputs, blur to submit form or move focus
    else if (element instanceof HTMLInputElement) {
      const form = element.form;
      if (form) {
        // Try to submit form
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      } else {
        element.blur();
      }
    }
  }

  // Execute {tab} command
  private async executeTab(element: HTMLElement): Promise<void> {
    this.log('Executing {tab}');

    // Try to focus next focusable element
    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
      )
    );

    const currentIndex = focusableElements.indexOf(element);
    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      const nextElement = focusableElements[currentIndex + 1];
      nextElement.focus();
    }
  }

  // Execute {delay} command
  private async executeDelay(options?: string): Promise<void> {
    const defaultDelay = 1000; // 1 second default
    let delayMs = defaultDelay;

    if (options) {
      // Parse delay format: "+1s", "+300ms", "1s", "300ms"
      const match = options.match(/\+?(\d+(?:\.\d+)?)(s|ms)?/);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2] || 's';
        delayMs = unit === 'ms' ? value : value * 1000;
      }
    }

    this.log(`Executing {delay} for ${delayMs}ms`);
    await this.delay(delayMs);
  }

  // Execute {key: X} command
  private async executeKey(element: HTMLElement, keyName?: string): Promise<void> {
    if (!keyName) {
      console.warn('TextBlitz: {key} command requires a key name');
      return;
    }

    // Import CommandParser for key mapping
    const { CommandParser } = await import('../command-parser');
    const keyInfo = CommandParser.normalizeKeyName(keyName);

    if (!keyInfo) {
      console.warn(`TextBlitz: Unknown key name: ${keyName}`);
      return;
    }

    this.log(`Executing {key: ${keyName}} → ${keyInfo.code}`);

    // Dispatch keyboard event
    const keyEvent = new KeyboardEvent('keydown', {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(keyEvent);
  }
}
