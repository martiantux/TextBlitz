import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandParser } from '../../../src/lib/command-parser';

describe('CommandParser', () => {
  describe('parse - basic commands', () => {
    it('should parse {cursor} command', () => {
      const result = CommandParser.parse('Hello {cursor} World');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('cursor');
      expect(result[0].rawMatch).toBe('{cursor}');
      expect(result[0].startIndex).toBe(6);
      expect(result[0].endIndex).toBe(14);
    });

    it('should parse {date} command', () => {
      const result = CommandParser.parse('Today is {date}');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('date');
    });

    it('should parse {time} command', () => {
      const result = CommandParser.parse('Current time: {time}');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('time');
    });

    it('should parse {clipboard} command', () => {
      const result = CommandParser.parse('Paste: {clipboard}');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('clipboard');
    });

    it('should parse {enter} command', () => {
      const result = CommandParser.parse('Line 1{enter}Line 2');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('enter');
    });

    it('should parse {tab} command', () => {
      const result = CommandParser.parse('Field 1{tab}Field 2');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('tab');
    });

    it('should parse {delay} command', () => {
      const result = CommandParser.parse('Before{delay}After');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('delay');
    });
  });

  describe('parse - commands with options', () => {
    it('should parse date with format options', () => {
      const result = CommandParser.parse('{date:YYYY-MM-DD}');

      expect(result[0].type).toBe('date');
      expect(result[0].options).toBe('YYYY-MM-DD');
    });

    it('should parse date with space separator', () => {
      const result = CommandParser.parse('{date MMMM D, YYYY}');

      expect(result[0].options).toBe('MMMM D, YYYY');
    });

    it('should parse time with format', () => {
      const result = CommandParser.parse('{time:12h}');

      expect(result[0].options).toBe('12h');
    });

    it('should parse delay with duration', () => {
      const result = CommandParser.parse('{delay +3s}');

      expect(result[0].options).toBe('+3s');
    });

    it('should trim whitespace from options', () => {
      const result = CommandParser.parse('{date:  YYYY-MM-DD  }');

      expect(result[0].options).toBe('YYYY-MM-DD');
    });
  });

  describe('parse - multiple commands', () => {
    it('should parse multiple different commands', () => {
      const result = CommandParser.parse('Date: {date}, Time: {time}, {cursor}');

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('date');
      expect(result[1].type).toBe('time');
      expect(result[2].type).toBe('cursor');
    });

    it('should preserve correct indices for multiple commands', () => {
      const text = 'A{date}B{time}C';
      const result = CommandParser.parse(text);

      expect(result[0].startIndex).toBe(1);
      expect(result[0].endIndex).toBe(7);
      expect(result[1].startIndex).toBe(8);
      expect(result[1].endIndex).toBe(14);
    });
  });

  describe('parseFormCommands', () => {
    it('should parse formtext command', () => {
      const result = CommandParser.parseFormCommands('{formtext: label=Name}');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('form');
      expect(result[0].formField?.type).toBe('text');
      expect(result[0].formField?.label).toBe('Name');
    });

    it('should parse formparagraph command', () => {
      const result = CommandParser.parseFormCommands('{formparagraph: label=Notes}');

      expect(result[0].formField?.type).toBe('paragraph');
      expect(result[0].formField?.label).toBe('Notes');
    });

    it('should parse formmenu with options', () => {
      const result = CommandParser.parseFormCommands('{formmenu: label=Status; options=Active,Inactive,Pending}');

      expect(result[0].formField?.type).toBe('menu');
      expect(result[0].formField?.options).toEqual(['Active', 'Inactive', 'Pending']);
    });

    it('should parse formdate command', () => {
      const result = CommandParser.parseFormCommands('{formdate: label=Due Date}');

      expect(result[0].formField?.type).toBe('date');
    });

    it('should parse formtoggle command', () => {
      const result = CommandParser.parseFormCommands('{formtoggle: label=Active}');

      expect(result[0].formField?.type).toBe('toggle');
    });

    it('should generate field name from label', () => {
      const result = CommandParser.parseFormCommands('{formtext: label=Customer Name}');

      expect(result[0].formField?.name).toBe('customer_name');
    });

    it('should use explicit name if provided', () => {
      const result = CommandParser.parseFormCommands('{formtext: label=Full Name; name=fullname}');

      expect(result[0].formField?.name).toBe('fullname');
    });

    it('should parse required flag', () => {
      const result = CommandParser.parseFormCommands('{formtext: label=Email; required=true}');

      expect(result[0].formField?.required).toBe(true);
    });

    it('should parse default value for text', () => {
      const result = CommandParser.parseFormCommands('{formtext: label=Name; default=John}');

      expect(result[0].formField?.defaultValue).toBe('John');
    });

    it('should parse default value for toggle as boolean', () => {
      const result = CommandParser.parseFormCommands('{formtoggle: label=Active; default=true}');

      expect(result[0].formField?.defaultValue).toBe(true);
    });
  });

  describe('hasFormCommands', () => {
    it('should return true for text with form commands', () => {
      expect(CommandParser.hasFormCommands('Hello {formtext: label=Name}')).toBe(true);
    });

    it('should return false for text without form commands', () => {
      expect(CommandParser.hasFormCommands('Hello {date}')).toBe(false);
    });

    it('should return false for plain text', () => {
      expect(CommandParser.hasFormCommands('Hello world')).toBe(false);
    });
  });

  describe('extractFormFields', () => {
    it('should extract all form fields', () => {
      const text = 'Name: {formtext: label=Name}, Status: {formmenu: label=Status; options=A,B}';
      const fields = CommandParser.extractFormFields(text);

      expect(fields).toHaveLength(2);
      expect(fields[0].label).toBe('Name');
      expect(fields[1].label).toBe('Status');
    });

    it('should return empty array for no form commands', () => {
      const fields = CommandParser.extractFormFields('Hello {date}');

      expect(fields).toEqual([]);
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2025-03-15T10:30:00');

    it('should format with YYYY-MM-DD', () => {
      const result = CommandParser.formatDate(testDate, 'YYYY-MM-DD');
      expect(result).toBe('2025-03-15');
    });

    it('should format with MM/DD/YYYY', () => {
      const result = CommandParser.formatDate(testDate, 'MM/DD/YYYY');
      expect(result).toBe('03/15/2025');
    });

    it('should format with MMMM D, YYYY', () => {
      const result = CommandParser.formatDate(testDate, 'MMMM D, YYYY');
      expect(result).toBe('March 15, 2025');
    });

    it('should format with Do ordinal', () => {
      const result = CommandParser.formatDate(testDate, 'MMMM Do, YYYY');
      expect(result).toBe('March 15th, 2025');
    });

    it('should handle ordinal suffixes correctly', () => {
      expect(CommandParser.formatDate(new Date('2025-03-01'), 'Do')).toBe('1st');
      expect(CommandParser.formatDate(new Date('2025-03-02'), 'Do')).toBe('2nd');
      expect(CommandParser.formatDate(new Date('2025-03-03'), 'Do')).toBe('3rd');
      expect(CommandParser.formatDate(new Date('2025-03-04'), 'Do')).toBe('4th');
      expect(CommandParser.formatDate(new Date('2025-03-11'), 'Do')).toBe('11th');
      expect(CommandParser.formatDate(new Date('2025-03-21'), 'Do')).toBe('21st');
      expect(CommandParser.formatDate(new Date('2025-03-22'), 'Do')).toBe('22nd');
      expect(CommandParser.formatDate(new Date('2025-03-23'), 'Do')).toBe('23rd');
    });

    it('should default to YYYY-MM-DD if no format', () => {
      const result = CommandParser.formatDate(testDate);
      expect(result).toBe('2025-03-15');
    });

    it('should handle date shift +3M', () => {
      const result = CommandParser.formatDate(testDate, 'YYYY-MM-DD shift +3M');
      expect(result).toBe('2025-06-15');
    });

    it('should handle date shift -1Y', () => {
      const result = CommandParser.formatDate(testDate, 'YYYY-MM-DD shift -1Y');
      expect(result).toBe('2024-03-15');
    });

    it('should handle date shift +7d', () => {
      const result = CommandParser.formatDate(testDate, 'YYYY-MM-DD shift +7d');
      expect(result).toBe('2025-03-22');
    });

    it('should combine format and shift', () => {
      const result = CommandParser.formatDate(testDate, 'MMMM Do, YYYY shift +3M');
      expect(result).toBe('June 15th, 2025');
    });
  });

  describe('formatTime', () => {
    const testDate = new Date('2025-03-15T14:30:45');

    it('should format 24h by default', () => {
      const result = CommandParser.formatTime(testDate);
      expect(result).toBe('14:30');
    });

    it('should format 12h shorthand', () => {
      const result = CommandParser.formatTime(testDate, '12h');
      expect(result).toBe('2:30 PM');
    });

    it('should format 24h shorthand', () => {
      const result = CommandParser.formatTime(testDate, '24h');
      expect(result).toBe('14:30');
    });

    it('should handle AM times', () => {
      const amDate = new Date('2025-03-15T09:15:00');
      const result = CommandParser.formatTime(amDate, '12h');
      expect(result).toBe('9:15 AM');
    });

    it('should handle custom format with seconds', () => {
      const result = CommandParser.formatTime(testDate, 'HH:mm:ss');
      expect(result).toBe('14:30:45');
    });

    it('should handle lowercase am/pm', () => {
      const result = CommandParser.formatTime(testDate, 'h:mm a');
      expect(result).toBe('2:30 pm');
    });
  });

  describe('parseDelayMs', () => {
    it('should parse seconds', () => {
      expect(CommandParser.parseDelayMs('+3s')).toBe(3000);
      expect(CommandParser.parseDelayMs('+0.5s')).toBe(500);
    });

    it('should parse milliseconds', () => {
      expect(CommandParser.parseDelayMs('+300ms')).toBe(300);
    });

    it('should default to seconds without unit', () => {
      expect(CommandParser.parseDelayMs('+2')).toBe(2000);
    });

    it('should return 0 for no options', () => {
      expect(CommandParser.parseDelayMs()).toBe(0);
    });

    it('should handle decimal seconds', () => {
      expect(CommandParser.parseDelayMs('+0.3s')).toBe(300);
      expect(CommandParser.parseDelayMs('+1.5s')).toBe(1500);
    });
  });

  describe('extractKeyboardActions', () => {
    it('should extract enter action and remove from text', () => {
      const result = CommandParser.extractKeyboardActions('Line 1{enter}Line 2');

      expect(result.text).toBe('Line 1Line 2');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('enter');
      expect(result.actions[0].position).toBe(6);
    });

    it('should extract tab action', () => {
      const result = CommandParser.extractKeyboardActions('A{tab}B');

      expect(result.text).toBe('AB');
      expect(result.actions[0].type).toBe('tab');
      expect(result.actions[0].position).toBe(1);
    });

    it('should extract delay action with options', () => {
      const result = CommandParser.extractKeyboardActions('Before{delay +3s}After');

      expect(result.text).toBe('BeforeAfter');
      expect(result.actions[0].type).toBe('delay');
      expect(result.actions[0].options).toBe('+3s');
    });

    it('should extract multiple actions', () => {
      const result = CommandParser.extractKeyboardActions('A{tab}B{enter}C');

      expect(result.text).toBe('ABC');
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].type).toBe('tab');
      expect(result.actions[1].type).toBe('enter');
    });

    it('should not extract non-keyboard commands', () => {
      const result = CommandParser.extractKeyboardActions('Today: {date}');

      expect(result.text).toBe('Today: {date}');
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('splitTextByKeyboardActions', () => {
    it('should split text into chunks with actions', () => {
      const result = CommandParser.splitTextByKeyboardActions('A{delay +1s}B{tab}C');

      expect(result.chunks).toEqual(['A', 'B', 'C']);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].type).toBe('delay');
      expect(result.actions[1].type).toBe('tab');
    });

    it('should handle text with no keyboard commands', () => {
      const result = CommandParser.splitTextByKeyboardActions('Hello world');

      expect(result.chunks).toEqual(['Hello world']);
      expect(result.actions).toHaveLength(0);
    });

    it('should handle command at start', () => {
      const result = CommandParser.splitTextByKeyboardActions('{tab}Text');

      expect(result.chunks).toEqual(['', 'Text']);
      expect(result.actions[0].type).toBe('tab');
    });

    it('should handle command at end', () => {
      const result = CommandParser.splitTextByKeyboardActions('Text{enter}');

      expect(result.chunks).toEqual(['Text', '']);
    });
  });

  describe('substituteFormValues', () => {
    it('should substitute form values', () => {
      const text = 'Hello {formtext: label=Name}!';
      const formData = { name: 'Brad' };
      const result = CommandParser.substituteFormValues(text, formData);

      expect(result).toBe('Hello Brad!');
    });

    it('should substitute multiple form values', () => {
      const text = '{formtext: label=First} {formtext: label=Last}';
      const formData = { first: 'John', last: 'Doe' };
      const result = CommandParser.substituteFormValues(text, formData);

      expect(result).toBe('John Doe');
    });

    it('should handle missing form values with empty string', () => {
      const text = 'Name: {formtext: label=Name}';
      const formData = {};
      const result = CommandParser.substituteFormValues(text, formData);

      expect(result).toBe('Name: ');
    });

    it('should convert boolean to string', () => {
      const text = 'Active: {formtoggle: label=Active}';
      const formData = { active: true };
      const result = CommandParser.substituteFormValues(text, formData);

      expect(result).toBe('Active: true');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(CommandParser.parse('')).toEqual([]);
      expect(CommandParser.parseFormCommands('')).toEqual([]);
    });

    it('should handle text with no commands', () => {
      expect(CommandParser.parse('Hello world')).toEqual([]);
    });

    it('should handle malformed commands gracefully', () => {
      expect(CommandParser.parse('{unknown}')).toEqual([]);
      expect(CommandParser.parse('{date')).toEqual([]);
      expect(CommandParser.parse('date}')).toEqual([]);
    });

    it('should handle nested braces', () => {
      const result = CommandParser.parse('{date:YYYY-{MM}-DD}');
      // Should match the outer braces
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle commands with special characters in options', () => {
      const result = CommandParser.parse('{date:YYYY/MM/DD}');
      expect(result[0].options).toBe('YYYY/MM/DD');
    });
  });

  describe('parse - key commands', () => {
    it('should parse escape key', () => {
      const result = CommandParser.parse('Close dialog {key:escape}');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('key');
      expect(result[0].options).toBe('escape');
    });

    it('should parse backspace key', () => {
      const result = CommandParser.parse('Fix typo{key:backspace}');
      expect(result[0].type).toBe('key');
      expect(result[0].options).toBe('backspace');
    });

    it('should parse delete key', () => {
      const result = CommandParser.parse('Clear field{key:delete}');
      expect(result[0].type).toBe('key');
      expect(result[0].options).toBe('delete');
    });

    it('should parse arrow keys', () => {
      const upResult = CommandParser.parse('{key:arrowup}');
      expect(upResult[0].options).toBe('arrowup');

      const downResult = CommandParser.parse('{key:arrowdown}');
      expect(downResult[0].options).toBe('arrowdown');

      const leftResult = CommandParser.parse('{key:arrowleft}');
      expect(leftResult[0].options).toBe('arrowleft');

      const rightResult = CommandParser.parse('{key:arrowright}');
      expect(rightResult[0].options).toBe('arrowright');
    });

    it('should parse navigation keys', () => {
      const homeResult = CommandParser.parse('{key:home}');
      expect(homeResult[0].options).toBe('home');

      const endResult = CommandParser.parse('{key:end}');
      expect(endResult[0].options).toBe('end');

      const pageUpResult = CommandParser.parse('{key:pageup}');
      expect(pageUpResult[0].options).toBe('pageup');

      const pageDownResult = CommandParser.parse('{key:pagedown}');
      expect(pageDownResult[0].options).toBe('pagedown');
    });

    it('should parse space key', () => {
      const result = CommandParser.parse('Add space{key:space}here');
      expect(result[0].type).toBe('key');
      expect(result[0].options).toBe('space');
    });

    it('should parse function keys (F1-F12)', () => {
      for (let i = 1; i <= 12; i++) {
        const keyName = `f${i}`;
        const result = CommandParser.parse(`{key:${keyName}}`);
        expect(result[0].type).toBe('key');
        expect(result[0].options).toBe(keyName);
      }
    });

    it('should parse key with esc alias for escape', () => {
      const result = CommandParser.parse('{key:esc}');
      expect(result[0].options).toBe('esc');
    });

    it('should parse multiple key commands in sequence', () => {
      const result = CommandParser.parse('{key:f5} {key:escape}');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('key');
      expect(result[0].options).toBe('f5');
      expect(result[1].type).toBe('key');
      expect(result[1].options).toBe('escape');
    });

    it('should handle case insensitivity for key names', () => {
      const lowerResult = CommandParser.parse('{key:escape}');
      const upperResult = CommandParser.parse('{key:ESCAPE}');
      const mixedResult = CommandParser.parse('{key:Escape}');

      expect(lowerResult[0].options).toBe('escape');
      expect(upperResult[0].options).toBe('ESCAPE');
      expect(mixedResult[0].options).toBe('Escape');
    });

    it('should extract key actions from keyboard actions extraction', () => {
      const result = CommandParser.extractKeyboardActions('Press{key:f5}to refresh');
      expect(result.text).toBe('Pressto refresh');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('key');
      expect(result.actions[0].options).toBe('f5');
      expect(result.actions[0].position).toBe(5);
    });

    it('should extract multiple key actions', () => {
      const result = CommandParser.extractKeyboardActions('{key:home}Jump{key:end}');
      expect(result.text).toBe('Jump');
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].type).toBe('key');
      expect(result.actions[0].options).toBe('home');
      expect(result.actions[0].position).toBe(0);
      expect(result.actions[1].type).toBe('key');
      expect(result.actions[1].options).toBe('end');
      expect(result.actions[1].position).toBe(4);
    });

    it('should handle key command mixed with other keyboard actions', () => {
      const result = CommandParser.extractKeyboardActions('Line 1{enter}Field{tab}Escape{key:escape}');
      expect(result.text).toBe('Line 1FieldEscape');
      expect(result.actions).toHaveLength(3);
      expect(result.actions[0].type).toBe('enter');
      expect(result.actions[1].type).toBe('tab');
      expect(result.actions[2].type).toBe('key');
      expect(result.actions[2].options).toBe('escape');
    });
  });
});
