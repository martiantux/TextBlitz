// Command parser for {command:options} syntax
// Supports {date}, {time}, {clipboard}, {cursor}, {enter}, {tab}, {delay}, {note}, {site}, {key}
// Also supports form commands: {formtext}, {formparagraph}, {formmenu}, {formdate}, {formtoggle}

import type { FormField } from './types';

export interface ParsedCommand {
  type: 'date' | 'time' | 'clipboard' | 'cursor' | 'enter' | 'tab' | 'delay' | 'site' | 'key' | 'form';
  options?: string;
  startIndex: number;
  endIndex: number;
  rawMatch: string;
  formField?: FormField; // For form commands
}

export class CommandParser {
  // Clipboard history storage (max 10 items)
  private static clipboardHistory: string[] = [];
  private static readonly MAX_HISTORY = 10;

  // Match {command} or {command:options} or {command options}
  // Added clipboardh\d+ for clipboard history (clipboardh1, clipboardh2, etc.)
  private static readonly COMMAND_REGEX = /\{(date|time|clipboard(?:h\d+)?|cursor|enter|tab|delay|site|key)(?:[\s:]([^}]+))?\}/g;

  // Match form commands: {formtext: label=Name}, {formmenu: label=Status; options=Active,Inactive}
  private static readonly FORM_COMMAND_REGEX = /\{(formtext|formparagraph|formmenu|formdate|formtoggle):([^}]+)\}/g;

  // Match note commands: {note}...{endnote} or {note: inline text}
  // Block form: {note}...{endnote} (without colon after note)
  private static readonly NOTE_BLOCK_REGEX = /\{note\}(.*?)\{endnote\}/gs;
  // Inline form: {note: text} (with colon)
  private static readonly NOTE_INLINE_REGEX = /\{note:\s*[^}]*\}/g;

  // Key name to KeyboardEvent code mapping
  static readonly KEY_MAP: Record<string, {code: string; key: string; keyCode?: number}> = {
    'enter': { code: 'Enter', key: 'Enter', keyCode: 13 },
    'tab': { code: 'Tab', key: 'Tab', keyCode: 9 },
    'escape': { code: 'Escape', key: 'Escape', keyCode: 27 },
    'esc': { code: 'Escape', key: 'Escape', keyCode: 27 },
    'backspace': { code: 'Backspace', key: 'Backspace', keyCode: 8 },
    'delete': { code: 'Delete', key: 'Delete', keyCode: 46 },
    'arrowup': { code: 'ArrowUp', key: 'ArrowUp', keyCode: 38 },
    'arrowdown': { code: 'ArrowDown', key: 'ArrowDown', keyCode: 40 },
    'arrowleft': { code: 'ArrowLeft', key: 'ArrowLeft', keyCode: 37 },
    'arrowright': { code: 'ArrowRight', key: 'ArrowRight', keyCode: 39 },
    'home': { code: 'Home', key: 'Home', keyCode: 36 },
    'end': { code: 'End', key: 'End', keyCode: 35 },
    'pageup': { code: 'PageUp', key: 'PageUp', keyCode: 33 },
    'pagedown': { code: 'PageDown', key: 'PageDown', keyCode: 34 },
    'space': { code: 'Space', key: ' ', keyCode: 32 },
    // Function keys
    'f1': { code: 'F1', key: 'F1', keyCode: 112 },
    'f2': { code: 'F2', key: 'F2', keyCode: 113 },
    'f3': { code: 'F3', key: 'F3', keyCode: 114 },
    'f4': { code: 'F4', key: 'F4', keyCode: 115 },
    'f5': { code: 'F5', key: 'F5', keyCode: 116 },
    'f6': { code: 'F6', key: 'F6', keyCode: 117 },
    'f7': { code: 'F7', key: 'F7', keyCode: 118 },
    'f8': { code: 'F8', key: 'F8', keyCode: 119 },
    'f9': { code: 'F9', key: 'F9', keyCode: 120 },
    'f10': { code: 'F10', key: 'F10', keyCode: 121 },
    'f11': { code: 'F11', key: 'F11', keyCode: 122 },
    'f12': { code: 'F12', key: 'F12', keyCode: 123 },
  };

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

  // Parse form commands from text
  static parseFormCommands(text: string): ParsedCommand[] {
    const commands: ParsedCommand[] = [];
    const regex = new RegExp(this.FORM_COMMAND_REGEX);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const [rawMatch, formType, optionsString] = match;
      const formField = this.parseFormField(formType, optionsString);

      if (formField) {
        commands.push({
          type: 'form',
          options: optionsString,
          startIndex: match.index,
          endIndex: match.index + rawMatch.length,
          rawMatch,
          formField,
        });
      }
    }

    return commands;
  }

  // Parse form field options from string
  // Example: "label=Customer Name" or "label=Status; options=Active,Inactive"
  private static parseFormField(formType: string, optionsString: string): FormField | null {
    const options = optionsString.split(';').map(s => s.trim());
    const params: Record<string, string> = {};

    for (const opt of options) {
      const [key, value] = opt.split('=').map(s => s.trim());
      if (key && value) {
        params[key] = value;
      }
    }

    const label = params.label || params.name || 'Field';
    const name = params.name || label.toLowerCase().replace(/\s+/g, '_');

    const field: FormField = {
      type: formType.replace('form', '') as any,
      name,
      label,
      required: params.required === 'true',
    };

    // Handle menu options
    if (formType === 'formmenu' && params.options) {
      field.options = params.options.split(',').map(s => s.trim());
    }

    // Handle default values
    if (params.default) {
      field.defaultValue = formType === 'formtoggle' ? params.default === 'true' : params.default;
    }

    return field;
  }

  // Check if text contains any form commands
  static hasFormCommands(text: string): boolean {
    return this.FORM_COMMAND_REGEX.test(text);
  }

  // Extract all form fields from text
  static extractFormFields(text: string): FormField[] {
    const commands = this.parseFormCommands(text);
    return commands.map(cmd => cmd.formField!).filter(Boolean);
  }

  // Strip note commands from text (they are comments, not output)
  // Supports both {note}...{endnote} blocks and {note: inline text}
  static stripNotes(text: string): string {
    return text
      .replace(this.NOTE_BLOCK_REGEX, '') // Remove {note}...{endnote} blocks
      .replace(this.NOTE_INLINE_REGEX, ''); // Remove {note: text} inline
  }

  // Get site information based on parameter
  // Supports: domain, title, url, selection
  static getSiteInfo(param: string): string {
    const normalized = param.toLowerCase().trim();

    switch (normalized) {
      case 'domain':
        return window.location.hostname;
      case 'title':
        return document.title;
      case 'url':
        return window.location.href;
      case 'selection':
        return window.getSelection()?.toString() || '';
      default:
        console.warn(`TextBlitz: Unknown site parameter: ${param}`);
        return '';
    }
  }

  // Add item to clipboard history
  // History is FIFO: [most recent, 2nd recent, 3rd recent, ...]
  // clipboardh1 = most recent, clipboardh2 = 2nd recent, etc.
  private static addToHistory(text: string): void {
    // Don't add empty or duplicate (if same as last)
    if (!text || (this.clipboardHistory.length > 0 && this.clipboardHistory[0] === text)) {
      return;
    }

    // Add to front of array
    this.clipboardHistory.unshift(text);

    // Keep only MAX_HISTORY items
    if (this.clipboardHistory.length > this.MAX_HISTORY) {
      this.clipboardHistory = this.clipboardHistory.slice(0, this.MAX_HISTORY);
    }
  }

  // Get clipboard history item by index (1-based: 1 = most recent)
  // Returns empty string if index out of bounds
  static getClipboardHistory(index: number): string {
    return this.clipboardHistory[index - 1] || '';
  }

  // Clear clipboard history (useful for privacy)
  static clearClipboardHistory(): void {
    this.clipboardHistory = [];
  }

  // Normalize key name and return key info from KEY_MAP
  // Returns null if key not found
  static normalizeKeyName(keyName: string): {code: string; key: string; keyCode?: number} | null {
    const normalized = keyName.toLowerCase().trim();
    return this.KEY_MAP[normalized] || null;
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

    // Format replacements - match all patterns and replace simultaneously
    // This avoids the issue where "MMMM" → "March" then "M" in "March" gets replaced
    const replacements: Record<string, string> = {
      'YYYY': String(year),
      'YY': String(year).slice(-2),
      'MMMM': monthName,
      'MMM': monthNameShort,
      'MM': month,
      'M': String(workingDate.getMonth() + 1),
      'Do': `${day}${this.getOrdinalSuffix(day)}`,
      'DD': dayPadded,
      'D': String(day),
    };

    // Build regex that matches all patterns (longest first)
    const patterns = Object.keys(replacements).sort((a, b) => b.length - a.length);
    const regex = new RegExp(patterns.join('|'), 'g');

    // Replace all matches at once
    return format.replace(regex, (match) => replacements[match] || match);
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
          // Check if this is clipboard history (clipboardh1, clipboardh2, etc.)
          const historyMatch = cmd.rawMatch.match(/clipboardh(\d+)/);
          if (historyMatch) {
            const index = parseInt(historyMatch[1], 10) - 1; // h1 = index 0, h2 = index 1
            replacement = this.clipboardHistory[index] || '';
          } else {
            // Regular clipboard - read current and update history
            try {
              replacement = await navigator.clipboard.readText();
              this.addToHistory(replacement);
            } catch (e) {
              console.warn('TextBlitz: Clipboard access denied or unavailable');
              replacement = cmd.rawMatch; // Keep original if clipboard fails
            }
          }
          break;
        case 'site':
          replacement = this.getSiteInfo(cmd.options || 'url');
          break;
        case 'cursor':
        case 'enter':
        case 'tab':
        case 'delay':
        case 'key':
          // Don't replace these - handled separately by TextReplacer
          continue;
        default:
          replacement = cmd.rawMatch;
      }

      result = result.slice(0, cmd.startIndex) + replacement + result.slice(cmd.endIndex);
    }

    return result;
  }

  // Extract keyboard actions from text (enter, tab, delay, key)
  // Returns {text: cleanText, actions: [{type, options, position}]}
  static extractKeyboardActions(text: string): {
    text: string;
    actions: Array<{ type: 'enter' | 'tab' | 'delay' | 'key'; options?: string; position: number }>;
  } {
    const commands = this.parse(text);
    const actions: Array<{ type: 'enter' | 'tab' | 'delay' | 'key'; options?: string; position: number }> = [];
    let result = text;
    let offset = 0;

    for (const cmd of commands) {
      if (cmd.type === 'enter' || cmd.type === 'tab' || cmd.type === 'delay' || cmd.type === 'key') {
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
    actions: Array<{ type: 'enter' | 'tab' | 'delay' | 'key'; options?: string }>;
  } {
    const commands = this.parse(text);
    const keyboardCommands = commands.filter(
      cmd => cmd.type === 'enter' || cmd.type === 'tab' || cmd.type === 'delay' || cmd.type === 'key'
    );

    if (keyboardCommands.length === 0) {
      return { chunks: [text], actions: [] };
    }

    const chunks: string[] = [];
    const actions: Array<{ type: 'enter' | 'tab' | 'delay' | 'key'; options?: string }> = [];
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

  // Substitute form values into text
  // Example: "Hello {formtext: label=Name}" with {name: "Brad"} → "Hello Brad"
  static substituteFormValues(text: string, formData: Record<string, string | boolean>): string {
    const commands = this.parseFormCommands(text);
    if (commands.length === 0) return text;

    let result = text;
    // Process in reverse to preserve indices
    for (let i = commands.length - 1; i >= 0; i--) {
      const cmd = commands[i];
      if (cmd.formField) {
        const value = formData[cmd.formField.name];
        const replacement = value !== undefined ? String(value) : '';
        result = result.slice(0, cmd.startIndex) + replacement + result.slice(cmd.endIndex);
      }
    }

    return result;
  }
}
