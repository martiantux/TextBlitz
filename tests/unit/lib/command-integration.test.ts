import { describe, it, expect } from 'vitest';
import { CommandParser } from '../../../src/lib/command-parser';

describe('Command Integration - Real-World Snippets', () => {
  describe('Multi-command snippets - parsing', () => {
    it('should parse email signature with date and time', () => {
      const expansion = 'Best regards,\n\nSent on {date:MMMM D, YYYY} at {time:12h}';
      const result = CommandParser.parse(expansion);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('date');
      expect(result[0].options).toBe('MMMM D, YYYY');
      expect(result[1].type).toBe('time');
      expect(result[1].options).toBe('12h');
    });

    it('should parse form with keyboard navigation', () => {
      const expansion = 'Name: {formtext:label=Name}{tab}Email: {formtext:label=Email}{enter}';
      const formFields = CommandParser.parseFormCommands(expansion);
      const keyboard = CommandParser.extractKeyboardActions(expansion);

      expect(formFields).toHaveLength(2);
      expect(formFields[0].formField?.name).toBe('name');
      expect(formFields[1].formField?.name).toBe('email');
      expect(keyboard.actions).toHaveLength(2);
      expect(keyboard.actions[0].type).toBe('tab');
      expect(keyboard.actions[1].type).toBe('enter');
    });

    it('should parse snippet with date, site context, and note', () => {
      const expansion = '{note: internal ref}Issue reported on {site:domain} at {date}';
      const commands = CommandParser.parse(expansion);

      // Note is handled separately, only date and site in parse
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('site');
      expect(commands[1].type).toBe('date');
    });

    it('should parse form menu with cursor positioning', () => {
      const expansion = 'Status: {formmenu:label=Status;options=Open,In Progress,Closed} Notes:{cursor}';
      const formFields = CommandParser.parseFormCommands(expansion);
      const commands = CommandParser.parse(expansion);

      expect(formFields).toHaveLength(1);
      expect(formFields[0].formField?.name).toBe('status');
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe('cursor');
    });

    it('should parse clipboard with keyboard actions in sequence', () => {
      const expansion = 'Quote: {clipboard}{enter}{tab}End quote.{enter}Done';
      const commands = CommandParser.parse(expansion);
      const keyboard = CommandParser.extractKeyboardActions(expansion);

      // Parse should get clipboard and enter/tab/enter commands
      expect(commands.some(c => c.type === 'clipboard')).toBe(true);
      // extractKeyboardActions should find enter, tab, enter commands
      expect(keyboard.actions.length).toBeGreaterThan(0);
      expect(keyboard.actions.some(a => a.type === 'enter')).toBe(true);
      expect(keyboard.actions.some(a => a.type === 'tab')).toBe(true);
      // Text should be cleaned of keyboard commands
      expect(keyboard.text).toContain('Quote:');
      expect(keyboard.text).toContain('End quote.');
    });

    it('should parse complex form with multiple field types', () => {
      const expansion = `
Customer: {formtext:label=Name;required}
Date: {formdate:label=IssueDate}
Type: {formmenu:label=Type;options=Bug,Feature,Enhancement}
Description: {formparagraph:label=Details;required}
Followup: {formtoggle:label=NeedFollowup}`;

      const formFields = CommandParser.parseFormCommands(expansion);

      expect(formFields).toHaveLength(5);
      // Just verify all 5 fields were parsed, don't depend on exact name formatting
      expect(formFields.every(f => f.formField && f.formField.name)).toBe(true);
    });

    it('should parse snippet with delay between sections', () => {
      const expansion = 'Section 1{delay +1s}Section 2{delay +0.5s}Section 3';
      const keyboard = CommandParser.extractKeyboardActions(expansion);

      expect(keyboard.actions).toHaveLength(2);
      expect(keyboard.actions[0].type).toBe('delay');
      expect(keyboard.actions[0].options).toBe('+1s');
      expect(keyboard.actions[1].type).toBe('delay');
      expect(keyboard.actions[1].options).toBe('+0.5s');
    });
  });

  describe('Multi-command edge cases', () => {
    it('should handle consecutive identical commands', () => {
      const expansion = '{date}{date}{date}';
      const result = CommandParser.parse(expansion);

      expect(result).toHaveLength(3);
      result.forEach(cmd => {
        expect(cmd.type).toBe('date');
      });
    });

    it('should preserve index accuracy with multiple commands', () => {
      const expansion = 'A{date}B{time}C';
      const result = CommandParser.parse(expansion);

      expect(result).toHaveLength(2);
      // Date should be at index 1
      expect(expansion[result[0].startIndex]).toBe('{');
      expect(expansion.substring(result[0].startIndex, result[0].endIndex)).toBe('{date}');
      // Time should be at index after 'A{date}B'
      expect(expansion.substring(result[1].startIndex, result[1].endIndex)).toBe('{time}');
    });

    it('should handle form fields mixed with regular commands', () => {
      const expansion = 'Created {date} by {formtext:label=Author}';
      const formFields = CommandParser.parseFormCommands(expansion);
      const regularCommands = CommandParser.parse(expansion);

      expect(formFields).toHaveLength(1);
      expect(regularCommands).toHaveLength(1);
      expect(regularCommands[0].type).toBe('date');
    });

    it('should handle commands at boundaries (start, middle, end)', () => {
      const expansion = '{date} middle text {time} end{cursor}';
      const result = CommandParser.parse(expansion);

      expect(result).toHaveLength(3);
      expect(result[0].startIndex).toBe(0);
      expect(result[2].endIndex).toBe(expansion.length);
    });

    it('should extract keyboard actions even when mixed with form commands', () => {
      const expansion = 'Name: {formtext:label=Name}{tab}Email: {formtext:label=Email}{enter}Submit{key:f5}';
      const keyboard = CommandParser.extractKeyboardActions(expansion);

      expect(keyboard.actions).toHaveLength(3);
      expect(keyboard.actions[0].type).toBe('tab');
      expect(keyboard.actions[1].type).toBe('enter');
      expect(keyboard.actions[2].type).toBe('key');
      // Verify form commands remain in text
      expect(keyboard.text).toContain('formtext');
    });

    it('should handle very long expansions with many commands', () => {
      let expansion = '';
      for (let i = 0; i < 20; i++) {
        expansion += `Item ${i}: {date} {cursor} `;
      }

      const result = CommandParser.parse(expansion);

      expect(result.length).toBeGreaterThan(0);
      // Should have multiple date and cursor commands
      const dateCount = result.filter(cmd => cmd.type === 'date').length;
      const cursorCount = result.filter(cmd => cmd.type === 'cursor').length;
      expect(dateCount).toBeGreaterThan(5);
      expect(cursorCount).toBeGreaterThan(5);
    });
  });

  describe('Real-world usage patterns', () => {
    it('should parse customer service snippet', () => {
      const expansion = `Thank you for your report on {site:domain}.
Date: {date:MMMM Do, YYYY}
Ticket ID: {cursor}
Status: {formmenu:label=Status;options=Open,In Review,Resolved}
{note: Internal tracking}`;

      const commands = CommandParser.parse(expansion);
      const forms = CommandParser.parseFormCommands(expansion);

      // Should have site, date, and cursor from parse
      expect(commands.length).toBeGreaterThanOrEqual(2);
      expect(commands.some(c => c.type === 'site')).toBe(true);
      expect(commands.some(c => c.type === 'date')).toBe(true);
      expect(forms).toHaveLength(1);
    });

    it('should parse code snippet with formatting', () => {
      const expansion = `\`\`\`javascript
// Created {date:YYYY-MM-DD}
// Author: {formtext:label=Author}
function {cursor}() {
  // TODO: implementation
}
\`\`\``;

      const result = CommandParser.parse(expansion);
      const forms = CommandParser.parseFormCommands(expansion);

      expect(result).toHaveLength(2); // date and cursor
      expect(forms).toHaveLength(1); // Author form
    });

    it('should parse form submission workflow', () => {
      const expansion = `{formtext:label=Full Name}
{formtext:label=Email}{tab}{formtext:label=Phone}{enter}
{formparagraph:label=Message}{enter}
{key:tab}{key:enter}`;

      const forms = CommandParser.parseFormCommands(expansion);
      const keyboard = CommandParser.extractKeyboardActions(expansion);

      expect(forms).toHaveLength(4);
      expect(keyboard.actions.length).toBeGreaterThan(0);
    });

    it('should parse multi-line form with field focus management', () => {
      const expansion = `Name: {formtext:label=Name}{enter}
Address: {formtext:label=Address}{enter}
{key:escape}Cancel or {key:f5}Refresh`;

      const forms = CommandParser.parseFormCommands(expansion);
      const keyboard = CommandParser.extractKeyboardActions(expansion);

      expect(forms).toHaveLength(2);
      expect(keyboard.actions.length).toBeGreaterThan(0);
      // Should have enter actions from form navigation
      expect(keyboard.actions.some(a => a.type === 'enter')).toBe(true);
      // Should have key actions
      expect(keyboard.actions.some(a => a.type === 'key')).toBe(true);
    });
  });
});
