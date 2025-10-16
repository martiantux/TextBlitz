// Base interface for all site-specific handlers
export interface ReplacementHandler {
  name: string;
  priority: number; // Higher = try first
  canHandle(element: HTMLElement): boolean;
  replace(element: HTMLElement, trigger: string, expansion: string): Promise<boolean>;
}

export abstract class BaseHandler implements ReplacementHandler {
  abstract name: string;
  abstract priority: number;
  protected debugMode = false;

  abstract canHandle(element: HTMLElement): boolean;
  abstract replace(element: HTMLElement, trigger: string, expansion: string): Promise<boolean>;

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
}
