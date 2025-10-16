import { ReplacementHandler } from './base-handler';
import { GoogleDocsHandler } from './google-docs-handler';
import { ReactHandler } from './react-handler';
import { ContentEditableHandler } from './contenteditable-handler';
import { StandardHandler } from './standard-handler';

/**
 * Handler Registry - manages all site-specific replacement handlers
 *
 * To add support for a new site:
 * 1. Create new handler class extending BaseHandler
 * 2. Add to registry in constructor
 * 3. Handler automatically used when canHandle() returns true
 */
export class HandlerRegistry {
  private handlers: ReplacementHandler[] = [];
  private debugMode = false;

  constructor() {
    // Register handlers in priority order (highest first)
    this.register(new GoogleDocsHandler());
    this.register(new ReactHandler());
    this.register(new ContentEditableHandler());
    this.register(new StandardHandler());

    // Sort by priority (highest first)
    this.handlers.sort((a, b) => b.priority - a.priority);
  }

  private register(handler: ReplacementHandler): void {
    this.handlers.push(handler);
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.handlers.forEach(h => {
      if ('setDebugMode' in h) {
        (h as any).setDebugMode(enabled);
      }
    });
  }

  /**
   * Get appropriate handler for element
   * Returns first handler where canHandle() returns true
   */
  getHandler(element: HTMLElement): ReplacementHandler | null {
    for (const handler of this.handlers) {
      if (handler.canHandle(element)) {
        if (this.debugMode) {
          console.log(`TextBlitz: Selected handler: ${handler.name}`);
        }
        return handler;
      }
    }
    return null;
  }

  /**
   * Get all handlers that can handle this element (for fallback chain)
   */
  getHandlerChain(element: HTMLElement): ReplacementHandler[] {
    return this.handlers.filter(h => h.canHandle(element));
  }

  /**
   * List all registered handlers (for debugging)
   */
  listHandlers(): string[] {
    return this.handlers.map(h => `${h.name} (priority: ${h.priority})`);
  }
}
