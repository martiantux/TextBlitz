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
  private maxLogs: number = 100; // Keep last 100 logs

  private constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  private addLog(entry: LogEntry) {
    // Add session ID to context
    if (!entry.context) entry.context = {};
    entry.context.sessionId = this.sessionId;

    this.logs.push(entry);

    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
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

  // Format logs for GitHub issue
  formatForGitHub(): string {
    const errors = this.getErrors();
    const recentLogs = this.getRecentLogs(20);

    let report = '## TextBlitz Error Report\n\n';
    report += `**Session ID:** ${this.sessionId}\n`;
    report += `**Timestamp:** ${new Date().toISOString()}\n`;
    report += `**Site:** ${window.location.hostname}\n`;
    report += `**User Agent:** ${navigator.userAgent}\n\n`;

    if (errors.length > 0) {
      report += '### Errors\n\n';
      errors.forEach(log => {
        report += `- **${log.category}** (${new Date(log.timestamp).toISOString()}): ${log.message}\n`;
        if (log.context) {
          report += `  \`\`\`json\n  ${JSON.stringify(log.context, null, 2)}\n  \`\`\`\n`;
        }
      });
      report += '\n';
    }

    report += '### Recent Activity (Last 20 events)\n\n';
    report += '```\n';
    recentLogs.forEach(log => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].split('.')[0];
      report += `[${time}] ${log.level.toUpperCase()} ${log.category}: ${log.message}\n`;
    });
    report += '```\n';

    return report;
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
