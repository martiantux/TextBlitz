import { CaseTransform } from './types';
import { CommandParser } from './command-parser';
import { CaseTransformer } from './case-transform';
import { logger } from './logger';
import { HandlerRegistry } from './handlers/handler-registry';

/**
 * NEW TextReplacer - Uses modular handler system
 *
 * Key improvements:
 * - Modular handlers for different sites
 * - Easy to add new site support
 * - Fallback chain if handler fails
 * - Comprehensive logging
 * - Content verification
 */
export class TextReplacer {
  private static debugMode = false;
  private static registry = new HandlerRegistry();

  static setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.registry.setDebugMode(enabled);
    logger.setDebugMode(enabled);
  }

  private static log(...args: any[]): void {
    if (this.debugMode) {
      console.log('TextBlitz [Replacer]:', ...args);
    }
  }

  /**
   * Main replacement method
   *
   * @param element - Target element
   * @param trigger - Trigger text to replace
   * @param expansion - Replacement text
   * @param caseTransform - Optional case transformation
   * @param typedTrigger - Actual typed trigger (may differ in case)
   * @returns true if replacement succeeded
   */
  static async replace(
    element: HTMLElement,
    trigger: string,
    expansion: string,
    caseTransform?: CaseTransform,
    typedTrigger?: string
  ): Promise<boolean> {
    const triggerToRemove = typedTrigger || trigger;
    const context = {
      element: logger.getElementContext(element),
      site: logger.getSiteContext(),
      snippet: { trigger }
    };

    try {
      logger.info('expansion', 'Starting replacement', context);

      // Validate element
      if (!document.contains(element)) {
        logger.warn('expansion', 'Element not in document', context);
        return false;
      }

      // Process commands in expansion
      let processedExpansion = await CommandParser.processCommands(expansion);

      // Apply case transformation
      if (caseTransform && caseTransform !== 'none') {
        processedExpansion = CaseTransformer.transform(processedExpansion, caseTransform, trigger);
      }

      // Parse cursor position
      const cursorMarker = '{cursor}';
      const cursorIndex = processedExpansion.indexOf(cursorMarker);
      let cursorOffset: number | undefined = undefined;

      if (cursorIndex !== -1) {
        // Remove cursor marker and track its position
        processedExpansion = processedExpansion.slice(0, cursorIndex) + processedExpansion.slice(cursorIndex + cursorMarker.length);
        cursorOffset = cursorIndex;
        this.log(`Cursor position: ${cursorOffset}`);
      }

      // Extract keyboard actions and chunks
      const { chunks, actions } = CommandParser.splitTextByKeyboardActions(processedExpansion);
      const finalExpansion = chunks.join('');

      this.log('Final expansion:', finalExpansion);
      if (chunks.length > 1) {
        this.log(`Split into ${chunks.length} chunks with ${actions.length} actions`);
      }

      // Get handler for this element
      const handler = this.registry.getHandler(element);
      if (!handler) {
        logger.error('expansion', 'No handler available for element', context);
        return false;
      }

      logger.info('handler', `Using ${handler.name} handler`, context);

      // Save content before replacement (for rollback)
      const contentBefore = this.getElementText(element);

      // Determine what to pass to handlers
      const hasKeyboardActions = chunks.length > 1 && actions.length > 0;

      // Try replacement
      const success = await handler.replace(
        element,
        triggerToRemove,
        finalExpansion,
        cursorOffset,
        hasKeyboardActions ? chunks : undefined,
        hasKeyboardActions ? actions : undefined
      );

      if (success) {
        logger.info('success', `${handler.name} handler succeeded`, context);
        return true;
      }

      // Handler failed, try fallback chain
      logger.warn('handler', `${handler.name} handler failed, trying fallback chain`, context);

      const handlerChain = this.registry.getHandlerChain(element);
      for (const fallbackHandler of handlerChain) {
        if (fallbackHandler === handler) continue; // Skip the one we already tried

        logger.info('fallback', `Trying fallback: ${fallbackHandler.name}`, context);

        const fallbackSuccess = await fallbackHandler.replace(
          element,
          triggerToRemove,
          finalExpansion,
          cursorOffset,
          hasKeyboardActions ? chunks : undefined,
          hasKeyboardActions ? actions : undefined
        );

        if (fallbackSuccess) {
          logger.info('success', `Fallback ${fallbackHandler.name} succeeded`, context);
          return true;
        }
      }

      // All handlers failed - rollback
      logger.error('fail', 'All handlers failed, rolling back', context);
      this.rollback(element, contentBefore);

      return false;

    } catch (error) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? error.message : String(error)
      };
      logger.error('fail', 'Fatal error in replace', errorContext);
      console.error('TextBlitz: Fatal error:', error);
      return false;
    }
  }

  /**
   * Get element text content
   */
  private static getElementText(element: HTMLElement): string {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }
    return element.textContent || '';
  }

  /**
   * Rollback element to previous content
   */
  private static rollback(element: HTMLElement, previousContent: string): void {
    try {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = previousContent;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (element.isContentEditable) {
        element.textContent = previousContent;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      this.log('Rolled back to previous content');
    } catch (error) {
      console.error('TextBlitz: Rollback failed:', error);
    }
  }

  /**
   * Check if element is valid for text expansion
   */
  static isValidInputElement(element: HTMLElement): boolean {
    // Skip password fields
    if (element instanceof HTMLInputElement && element.type === 'password') {
      return false;
    }

    // Skip hidden fields
    if (element instanceof HTMLInputElement && element.type === 'hidden') {
      return false;
    }

    // Skip incompatible input types
    if (element instanceof HTMLInputElement) {
      const incompatibleTypes = [
        'number', 'date', 'time', 'color', 'range',
        'file', 'datetime-local', 'month', 'week'
      ];
      if (incompatibleTypes.includes(element.type)) {
        return false;
      }
    }

    // Accept inputs, textareas, and contenteditable
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element.isContentEditable
    );
  }

  /**
   * List all available handlers (for debugging)
   */
  static listHandlers(): string[] {
    return this.registry.listHandlers();
  }
}
