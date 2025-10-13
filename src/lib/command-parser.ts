// Command parser for {command:options} syntax
// Supports {date}, {time}, {clipboard}, {cursor}, {enter}, {tab}, {delay}

export interface ParsedCommand {
  type: 'date' | 'time' | 'clipboard' | 'cursor' | 'enter' | 'tab' | 'delay';
  options?: string;
  startIndex: number;
  endIndex: number;
  rawMatch: string;
}

export class CommandParser {
  // Match {command} or {command:options} or {command options}
  private static readonly COMMAND_REGEX = /\{(date|time|clipboard|cursor|enter|tab|delay)(?:[\s:]([^}]+))?\}/g;

  // Parse all commands from text
  static parse(text: string): ParsedCommand[] {
    const commands: ParsedCommand[] = [];
    const regex = new RegExp(this.COMMAND_REGEX);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const [rawMatch, type, options] = match;
      commands.push({
        type: type as ParsedCommand['type'],
        options: options?.trim() || undefined,
        startIndex: match.index,
        endIndex: match.index + rawMatch.length,
        rawMatch,
      });
    }

    return commands;
  }

  // Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
  private static getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // Parse date shift (e.g., "shift +3M", "shift -1Y", "shift +7d")
  private static parseDateShift(options: string): { value: number; unit: 'd' | 'M' | 'Y' } | null {
    const shiftMatch = options.match(/shift\s+([+-]?\d+)([dMY])/);
    if (!shiftMatch) return null;

    const value = parseInt(shiftMatch[1], 10);
    const unit = shiftMatch[2] as 'd' | 'M' | 'Y';
    return { value, unit };
  }

  // Apply date shift to a date
  private static applyDateShift(date: Date, shift: { value: number; unit: 'd' | 'M' | 'Y' }): Date {
    const result = new Date(date);

    switch (shift.unit) {
      case 'd':
        result.setDate(result.getDate() + shift.value);
        break;
      case 'M':
        result.setMonth(result.getMonth() + shift.value);
        break;
      case 'Y':
        result.setFullYear(result.getFullYear() + shift.value);
        break;
    }

    return result;
  }

  // Format a date based on format string
  static formatDate(date: Date, options?: string): string {
    let workingDate = date;
    let format = options || 'YYYY-MM-DD';

    // Check for date shift in options (e.g., "MMMM Do YYYY shift +3M")
    if (options) {
      const shift = this.parseDateShift(options);
      if (shift) {
        workingDate = this.applyDateShift(date, shift);
        // Remove shift part from format string
        format = options.replace(/\s*shift\s+[+-]?\d+[dMY]\s*/, '').trim() || 'YYYY-MM-DD';
      }
    }

    const year = workingDate.getFullYear();
    const month = String(workingDate.getMonth() + 1).padStart(2, '0');
    const day = workingDate.getDate();
    const dayPadded = String(day).padStart(2, '0');
    const monthName = workingDate.toLocaleDateString('en-US', { month: 'long' });
    const monthNameShort = workingDate.toLocaleDateString('en-US', { month: 'short' });

    // Format replacements (order matters - Do before D, MMMM before MM)
    return format
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2))
      .replace('MMMM', monthName)
      .replace('MMM', monthNameShort)
      .replace('Do', `${day}${this.getOrdinalSuffix(day)}`)
      .replace('MM', month)
      .replace('M', String(workingDate.getMonth() + 1))
      .replace('DD', dayPadded)
      .replace('D', String(day));
  }

  // Format a time based on format string
  static formatTime(date: Date, format?: string): string {
    const defaultFormat = 'HH:mm'; // 24-hour
    const fmt = format || defaultFormat;

    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';

    // Handle shorthand formats
    if (fmt === '12h') {
      return `${hours12}:${minutes} ${ampm}`;
    }
    if (fmt === '24h') {
      return `${String(hours24).padStart(2, '0')}:${minutes}`;
    }

    // Handle custom formats
    return fmt
      .replace('HH', String(hours24).padStart(2, '0'))
      .replace('H', String(hours24))
      .replace('hh', String(hours12).padStart(2, '0'))
      .replace('h', String(hours12))
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('A', ampm)
      .replace('a', ampm.toLowerCase());
  }

  // Parse delay value from options (e.g., "+0.3s", "+300ms", or just delay defaults to 0)
  static parseDelayMs(options?: string): number {
    if (!options) return 0;

    // Match +0.3s or +300ms format
    const match = options.match(/\+?(\d+(?:\.\d+)?)(s|ms)?/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 's'; // default to seconds

    return unit === 'ms' ? value : value * 1000;
  }

  // Process all commands in text (except keyboard commands which are handled post-insertion)
  static async processCommands(text: string): Promise<string> {
    const commands = this.parse(text);
    if (commands.length === 0) return text;

    let result = text;
    const now = new Date();

    // Process commands in reverse order to preserve indices
    for (let i = commands.length - 1; i >= 0; i--) {
      const cmd = commands[i];
      let replacement: string;

      switch (cmd.type) {
        case 'date':
          replacement = this.formatDate(now, cmd.options);
          break;
        case 'time':
          replacement = this.formatTime(now, cmd.options);
          break;
        case 'clipboard':
          try {
            replacement = await navigator.clipboard.readText();
          } catch (e) {
            console.warn('TextBlitz: Clipboard access denied or unavailable');
            replacement = cmd.rawMatch; // Keep original if clipboard fails
          }
          break;
        case 'cursor':
        case 'enter':
        case 'tab':
        case 'delay':
          // Don't replace these - handled separately by TextReplacer
          continue;
        default:
          replacement = cmd.rawMatch;
      }

      result = result.slice(0, cmd.startIndex) + replacement + result.slice(cmd.endIndex);
    }

    return result;
  }

  // Extract keyboard actions from text (enter, tab, delay)
  // Returns {text: cleanText, actions: [{type, options, position}]}
  static extractKeyboardActions(text: string): {
    text: string;
    actions: Array<{ type: 'enter' | 'tab' | 'delay'; options?: string; position: number }>;
  } {
    const commands = this.parse(text);
    const actions: Array<{ type: 'enter' | 'tab' | 'delay'; options?: string; position: number }> = [];
    let result = text;
    let offset = 0;

    for (const cmd of commands) {
      if (cmd.type === 'enter' || cmd.type === 'tab' || cmd.type === 'delay') {
        // Remove the command from text and track position
        const position = cmd.startIndex - offset;
        actions.push({ type: cmd.type, options: cmd.options, position });

        result = result.slice(0, cmd.startIndex - offset) + result.slice(cmd.endIndex - offset);
        offset += cmd.rawMatch.length;
      }
    }

    return { text: result, actions };
  }

  // Split text into chunks with actions between them
  // Example: "A{delay +1s}B{tab}C" → chunks: ["A", "B", "C"], actions: [delay, tab]
  static splitTextByKeyboardActions(text: string): {
    chunks: string[];
    actions: Array<{ type: 'enter' | 'tab' | 'delay'; options?: string }>;
  } {
    const commands = this.parse(text);
    const keyboardCommands = commands.filter(
      cmd => cmd.type === 'enter' || cmd.type === 'tab' || cmd.type === 'delay'
    );

    if (keyboardCommands.length === 0) {
      return { chunks: [text], actions: [] };
    }

    const chunks: string[] = [];
    const actions: Array<{ type: 'enter' | 'tab' | 'delay'; options?: string }> = [];
    let lastIndex = 0;

    for (const cmd of keyboardCommands) {
      // Add text chunk before this command
      chunks.push(text.substring(lastIndex, cmd.startIndex));
      // Add the action
      actions.push({ type: cmd.type, options: cmd.options });
      lastIndex = cmd.endIndex;
    }

    // Add final chunk after last command
    chunks.push(text.substring(lastIndex));

    return { chunks, actions };
  }
}
