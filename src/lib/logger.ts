// Structured logging utility for debugging and issue reporting

export interface LogContext {
  element?: {
    tag: string;
    type?: string;
    id?: string;
    classes?: string;
    contentEditable?: boolean;
  };
  site?: {
    hostname: string;
    url: string;
  };
  snippet?: {
    trigger: string;
    label?: string;
    type?: string;
  };
  tier?: string;
  error?: string;
  timestamp?: number;
  sessionId?: string;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'init' | 'match' | 'expansion' | 'tier' | 'retry' | 'fail';
  message: string;
  context?: LogContext;
  timestamp: number;
}

class Logger {
  private static instance: Logger;
  private sessionId: string;
  private logs: LogEntry[] = [];
  private debugMode: boolean = false;
  private maxLogs: number = 30; // Keep last 30 logs for bug reports
  private initialized: boolean = false;

  private constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.loadFromStorage();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  private async loadFromStorage() {
    if (this.initialized) return;

    try {
      const result = await chrome.storage.local.get('logBuffer');
      if (result.logBuffer && Array.isArray(result.logBuffer)) {
        this.logs = result.logBuffer.slice(-this.maxLogs);
      }
      this.initialized = true;
    } catch (error) {
      console.error('TextBlitz: Failed to load logs from storage', error);
      this.initialized = true;
    }
  }

  private async saveToStorage() {
    try {
      await chrome.storage.local.set({
        logBuffer: this.logs.slice(-this.maxLogs)
      });
    } catch (error) {
      // Silently fail - don't block logging if storage fails
    }
  }

  private addLog(entry: LogEntry) {
    // Add session ID to context
    if (!entry.context) entry.context = {};
    entry.context.sessionId = this.sessionId;

    // Sanitize the entry before storing
    const sanitizedEntry = this.sanitizeLogEntry(entry);

    this.logs.push(sanitizedEntry);

    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Persist to storage (async, don't block)
    this.saveToStorage();
  }

  private sanitizeLogEntry(entry: LogEntry): LogEntry {
    const sanitized = { ...entry };

    if (sanitized.context) {
      sanitized.context = this.sanitizeContext(sanitized.context);
    }

    return sanitized;
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };

    // Redact site URLs if they contain sensitive info
    if (sanitized.site?.url) {
      try {
        const url = new URL(sanitized.site.url);
        // Keep protocol, hostname, pathname but remove query params and hash
        sanitized.site.url = `${url.protocol}//${url.hostname}${url.pathname}`;
      } catch (e) {
        sanitized.site.url = '[INVALID_URL]';
      }
    }

    // Redact error messages that might contain sensitive data
    if (sanitized.error) {
      sanitized.error = this.sanitizeString(sanitized.error);
    }

    return sanitized;
  }

  private sanitizeString(str: string): string {
    // Redact emails
    if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(str)) {
      str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    }

    // Redact things that look like API keys or tokens
    if (/^(Bearer|sk-|gsk_|sk-ant-|AI)[a-zA-Z0-9_-]{20,}/.test(str)) {
      return '[TOKEN]';
    }

    if (/^[a-zA-Z0-9_-]{32,}$/.test(str)) {
      return '[KEY]';
    }

    // Truncate very long strings
    if (str.length > 500) {
      return str.substring(0, 500) + '...[truncated]';
    }

    return str;
  }

  info(category: LogEntry['category'], message: string, context?: LogContext) {
    const entry: LogEntry = {
      level: 'info',
      category,
      message,
      context,
      timestamp: Date.now()
    };
    this.addLog(entry);
    if (this.debugMode) {
      console.log(`TextBlitz [${category}]:`, message, context || '');
    }
  }

  warn(category: LogEntry['category'], message: string, context?: LogContext) {
    const entry: LogEntry = {
      level: 'warn',
      category,
      message,
      context,
      timestamp: Date.now()
    };
    this.addLog(entry);
    if (this.debugMode) {
      console.warn(`TextBlitz [${category}]:`, message, context || '');
    }
  }

  error(category: LogEntry['category'], message: string, context?: LogContext) {
    const entry: LogEntry = {
      level: 'error',
      category,
      message,
      context,
      timestamp: Date.now()
    };
    this.addLog(entry);
    // Always log errors, even if debug mode is off
    console.error(`TextBlitz [${category}]:`, message, context || '');
  }

  debug(category: LogEntry['category'], message: string, context?: LogContext) {
    const entry: LogEntry = {
      level: 'debug',
      category,
      message,
      context,
      timestamp: Date.now()
    };
    this.addLog(entry);
    if (this.debugMode) {
      console.log(`TextBlitz [${category}] DEBUG:`, message, context || '');
    }
  }

  // Get element context for logging
  getElementContext(element: HTMLElement): LogContext['element'] {
    return {
      tag: element.tagName,
      type: element instanceof HTMLInputElement ? element.type : undefined,
      id: element.id || undefined,
      classes: element.className || undefined,
      contentEditable: element.isContentEditable
    };
  }

  // Get site context for logging
  getSiteContext(): LogContext['site'] {
    return {
      hostname: window.location.hostname,
      url: window.location.href
    };
  }

  // Get recent logs (for bug reports)
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by category
  getLogsByCategory(category: LogEntry['category']): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  // Get error logs
  getErrors(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error');
  }

  // Get a plaintext preview of logs for user review (before submitting)
  getLogsPreview(): string {
    if (this.logs.length === 0) {
      return 'No logs recorded yet.';
    }

    let preview = '';
    this.logs.forEach((log, index) => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      preview += `${index + 1}. [${time}] ${log.level.toUpperCase()} - ${log.category}: ${log.message}\n`;
    });

    return preview;
  }

  // Format logs for GitHub issue (for bug reports)
  formatForGitHub(includeSnippet: boolean = false, snippetData?: any): string {
    const errors = this.getErrors();
    const allLogs = this.getRecentLogs(30);

    let report = '## 🐛 Bug Report\n\n';
    report += `**Session ID:** ${this.sessionId}\n`;
    report += `**Timestamp:** ${new Date().toISOString()}\n`;

    // Try to get extension version from manifest
    try {
      report += `**Extension Version:** ${chrome.runtime.getManifest().version}\n`;
    } catch (e) {
      report += `**Extension Version:** Unknown\n`;
    }

    report += `**Browser:** ${navigator.userAgent}\n\n`;

    if (errors.length > 0) {
      report += '### ❌ Errors\n\n';
      errors.forEach((log, index) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        report += `${index + 1}. **[${time}] ${log.category}**: ${log.message}\n`;
        if (log.context) {
          report += `   <details>\n   <summary>Details</summary>\n\n   \`\`\`json\n   ${JSON.stringify(log.context, null, 2)}\n   \`\`\`\n   </details>\n\n`;
        }
      });
    }

    report += '<details>\n<summary>📋 Last 30 Log Entries</summary>\n\n```\n';
    allLogs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      report += `[${time}] ${log.level.padEnd(5)} | ${log.category.padEnd(10)} | ${log.message}\n`;
    });
    report += '```\n</details>\n\n';

    if (includeSnippet && snippetData) {
      report += '<details>\n<summary>📝 Snippet Details</summary>\n\n```json\n';
      report += JSON.stringify(snippetData, null, 2);
      report += '\n```\n</details>\n\n';
    }

    return report;
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
