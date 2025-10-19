import { describe, it, expect } from 'vitest';
import {
  isWordBoundary,
  shouldTriggerMatch,
  extractTriggerContext
} from '../../../src/lib/word-boundaries';

describe('word-boundaries', () => {
  describe('isWordBoundary', () => {
    it('should recognize whitespace as word boundary', () => {
      expect(isWordBoundary(' ')).toBe(true);
      expect(isWordBoundary('\t')).toBe(true);
      expect(isWordBoundary('\n')).toBe(true);
      expect(isWordBoundary('\r')).toBe(true);
    });

    it('should recognize punctuation as word boundary', () => {
      expect(isWordBoundary('.')).toBe(true);
      expect(isWordBoundary(',')).toBe(true);
      expect(isWordBoundary(';')).toBe(true);
      expect(isWordBoundary(':')).toBe(true);
      expect(isWordBoundary('!')).toBe(true);
      expect(isWordBoundary('?')).toBe(true);
    });

    it('should recognize brackets as word boundary', () => {
      expect(isWordBoundary('(')).toBe(true);
      expect(isWordBoundary(')')).toBe(true);
      expect(isWordBoundary('[')).toBe(true);
      expect(isWordBoundary(']')).toBe(true);
      expect(isWordBoundary('{')).toBe(true);
      expect(isWordBoundary('}')).toBe(true);
    });

    it('should recognize quotes as word boundary', () => {
      expect(isWordBoundary('"')).toBe(true);
      expect(isWordBoundary("'")).toBe(true);
    });

    it('should recognize special separators as word boundary', () => {
      expect(isWordBoundary('/')).toBe(true);
      expect(isWordBoundary('\\')).toBe(true);
      expect(isWordBoundary('|')).toBe(true);
      expect(isWordBoundary('<')).toBe(true);
      expect(isWordBoundary('>')).toBe(true);
      expect(isWordBoundary('-')).toBe(true);
      expect(isWordBoundary('_')).toBe(true);
    });

    it('should treat empty/undefined as word boundary', () => {
      expect(isWordBoundary('')).toBe(true);
      expect(isWordBoundary(undefined)).toBe(true);
    });

    it('should not recognize alphanumeric as word boundary', () => {
      expect(isWordBoundary('a')).toBe(false);
      expect(isWordBoundary('Z')).toBe(false);
      expect(isWordBoundary('5')).toBe(false);
    });

    it('should not recognize @ or # as word boundary', () => {
      expect(isWordBoundary('@')).toBe(false);
      expect(isWordBoundary('#')).toBe(false);
    });
  });

  describe('shouldTriggerMatch - word mode', () => {
    it('should trigger at start of text', () => {
      expect(shouldTriggerMatch('', 'brb', '', 'word')).toBe(true);
    });

    it('should trigger after space', () => {
      expect(shouldTriggerMatch('hello ', 'brb', '', 'word')).toBe(true);
    });

    it('should trigger after punctuation', () => {
      expect(shouldTriggerMatch('.', 'brb', '', 'word')).toBe(true);
      expect(shouldTriggerMatch(',', 'brb', '', 'word')).toBe(true);
      expect(shouldTriggerMatch('!', 'brb', '', 'word')).toBe(true);
    });

    it('should trigger after bracket', () => {
      expect(shouldTriggerMatch('(', 'brb', '', 'word')).toBe(true);
      expect(shouldTriggerMatch('[', 'brb', '', 'word')).toBe(true);
    });

    it('should not trigger mid-word', () => {
      expect(shouldTriggerMatch('hello', 'brb', '', 'word')).toBe(false);
      expect(shouldTriggerMatch('x', 'brb', '', 'word')).toBe(false);
      expect(shouldTriggerMatch('test123', 'brb', '', 'word')).toBe(false);
    });

    it('should trigger regardless of what comes after', () => {
      expect(shouldTriggerMatch(' ', 'brb', 'x', 'word')).toBe(true);
      expect(shouldTriggerMatch(' ', 'brb', '', 'word')).toBe(true);
      expect(shouldTriggerMatch(' ', 'brb', ' ', 'word')).toBe(true);
    });
  });

  describe('shouldTriggerMatch - word-both mode', () => {
    it('should trigger when surrounded by spaces', () => {
      expect(shouldTriggerMatch(' ', 'brb', ' ', 'word-both')).toBe(true);
    });

    it('should trigger at start with space after', () => {
      expect(shouldTriggerMatch('', 'brb', ' ', 'word-both')).toBe(true);
    });

    it('should NOT trigger at end without delimiter after', () => {
      // Even with space before, word-both requires delimiter after
      // User typed " brb" with no space after → should not trigger
      expect(shouldTriggerMatch(' ', 'brb', '', 'word-both')).toBe(false);
    });

    it('should trigger when both boundaries are punctuation', () => {
      expect(shouldTriggerMatch('.', 'brb', '.', 'word-both')).toBe(true);
      expect(shouldTriggerMatch('(', 'brb', ')', 'word-both')).toBe(true);
    });

    it('should not trigger without space after', () => {
      expect(shouldTriggerMatch(' ', 'brb', 'x', 'word-both')).toBe(false);
      expect(shouldTriggerMatch(' ', 'brb', '', 'word-both')).toBe(false);
    });

    it('should not trigger without space before', () => {
      expect(shouldTriggerMatch('x', 'brb', ' ', 'word-both')).toBe(false);
    });

    it('should not trigger mid-word on both sides', () => {
      expect(shouldTriggerMatch('x', 'brb', 'y', 'word-both')).toBe(false);
    });
  });

  describe('shouldTriggerMatch - anywhere mode', () => {
    it('should always trigger regardless of context', () => {
      expect(shouldTriggerMatch('', 'brb', '', 'anywhere')).toBe(true);
      expect(shouldTriggerMatch(' ', 'brb', ' ', 'anywhere')).toBe(true);
      expect(shouldTriggerMatch('x', 'brb', 'y', 'anywhere')).toBe(true);
      expect(shouldTriggerMatch('hello', 'brb', 'world', 'anywhere')).toBe(true);
    });

    it('should trigger mid-word', () => {
      expect(shouldTriggerMatch('test', 'brb', 'ing', 'anywhere')).toBe(true);
    });

    it('should trigger with no surrounding text', () => {
      expect(shouldTriggerMatch('', 'brb', '', 'anywhere')).toBe(true);
    });
  });

  describe('shouldTriggerMatch - edge cases', () => {
    it('should handle newlines as boundaries', () => {
      expect(shouldTriggerMatch('\n', 'brb', '\n', 'word-both')).toBe(true);
      expect(shouldTriggerMatch('\n', 'brb', '', 'word')).toBe(true);
    });

    it('should handle tabs as boundaries', () => {
      expect(shouldTriggerMatch('\t', 'brb', '\t', 'word-both')).toBe(true);
    });

    it('should handle mixed boundary characters', () => {
      expect(shouldTriggerMatch(' ', 'brb', '.', 'word-both')).toBe(true);
      expect(shouldTriggerMatch('.', 'brb', ' ', 'word-both')).toBe(true);
    });
  });

  describe('extractTriggerContext', () => {
    it('should extract trigger at end of text', () => {
      const result = extractTriggerContext('hello brb', 9, 3);

      expect(result.textBefore).toBe('hello ');
      expect(result.trigger).toBe('brb');
      expect(result.textAfter).toBe('');
    });

    it('should extract trigger in middle of text', () => {
      const result = extractTriggerContext('hello brb world', 9, 3);

      expect(result.textBefore).toBe('hello ');
      expect(result.trigger).toBe('brb');
      expect(result.textAfter).toBe(' world');
    });

    it('should extract trigger at start of text', () => {
      const result = extractTriggerContext('brb hello', 3, 3);

      expect(result.textBefore).toBe('');
      expect(result.trigger).toBe('brb');
      expect(result.textAfter).toBe(' hello');
    });

    it('should handle single character trigger', () => {
      const result = extractTriggerContext('hello x world', 7, 1);

      expect(result.textBefore).toBe('hello ');
      expect(result.trigger).toBe('x');
      expect(result.textAfter).toBe(' world');
    });

    it('should handle long trigger', () => {
      const trigger = 'verylongtrigger';
      const text = `hello ${trigger} world`;
      const endPos = 6 + trigger.length;
      const result = extractTriggerContext(text, endPos, trigger.length);

      expect(result.textBefore).toBe('hello ');
      expect(result.trigger).toBe(trigger);
      expect(result.textAfter).toBe(' world');
    });

    it('should handle trigger as entire text', () => {
      const result = extractTriggerContext('brb', 3, 3);

      expect(result.textBefore).toBe('');
      expect(result.trigger).toBe('brb');
      expect(result.textAfter).toBe('');
    });
  });
});
