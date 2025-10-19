import { describe, it, expect } from 'vitest';
import { CommandParser } from '../../../src/lib/command-parser';

describe('CommandParser - {note} command', () => {
  describe('stripNotes', () => {
    it('should remove {note}...{endnote} blocks', () => {
      const input = 'Hello {note}This is a comment{endnote}World';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('Hello World');
    });

    it('should remove {note: inline} comments', () => {
      const input = 'Hello {note: author comment}World';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('Hello World');
    });

    it('should handle multiple note blocks', () => {
      const input = 'A{note}comment1{endnote}B{note}comment2{endnote}C';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('ABC');
    });

    it('should handle multiple inline notes', () => {
      const input = 'A{note: c1}B{note: c2}C';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('ABC');
    });

    it('should handle mixed note types', () => {
      const input = 'Start{note: inline}Middle{note}block comment{endnote}End';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('StartMiddleEnd');
    });

    it('should handle multiline note blocks', () => {
      const input = `Hello
{note}
This is a multiline
comment block
{endnote}
World`;
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('Hello\n\nWorld');
    });

    it('should handle empty note blocks', () => {
      const input = 'Hello{note}{endnote}World';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('HelloWorld');
    });

    it('should handle empty inline notes', () => {
      const input = 'Hello{note: }World';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('HelloWorld');
    });

    it('should handle notes with special characters', () => {
      const input = 'Text{note: @#$%^&*()}More';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('TextMore');
    });

    it('should handle notes with nested braces in block form', () => {
      const input = 'Text{note}comment with {braces}{endnote}More';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('TextMore');
    });

    it('should not affect other commands', () => {
      const input = 'Hello {date}{note: comment}{time}World';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('Hello {date}{time}World');
    });

    it('should handle text with no notes', () => {
      const input = 'Hello World';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('Hello World');
    });

    it('should handle notes at start of text', () => {
      const input = '{note: starting comment}Hello World';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('Hello World');
    });

    it('should handle notes at end of text', () => {
      const input = 'Hello World{note: ending comment}';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('Hello World');
    });

    it('should handle adjacent notes', () => {
      const input = 'Text{note: c1}{note: c2}More';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('TextMore');
    });

    it('should handle notes with whitespace variations', () => {
      const input = 'Text{note:comment}More{note: spaced }End';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('TextMoreEnd');
    });

    it('should handle block notes with content between braces', () => {
      const input = 'A{note}Comment with {cursor} and {date}{endnote}B';
      const result = CommandParser.stripNotes(input);
      expect(result).toBe('AB');
    });

    it('should work with real-world snippet examples', () => {
      const input = `Dear {formtext: label=Name},
{note: This is the introduction paragraph}
Thank you for your inquiry.
{note}
Author: Brad
Last updated: 2025-10-19
Version: 1.0
{endnote}
Best regards,
{cursor}
John Doe`;
      const result = CommandParser.stripNotes(input);
      expect(result).toBe(`Dear {formtext: label=Name},

Thank you for your inquiry.

Best regards,
{cursor}
John Doe`);
    });
  });
});
