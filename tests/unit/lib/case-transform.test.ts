import { describe, it, expect } from 'vitest';
import { CaseTransformer } from '../../../src/lib/case-transform';

describe('CaseTransformer', () => {
  describe('detectCase', () => {
    it('should detect uppercase', () => {
      expect(CaseTransformer.detectCase('HELLO')).toBe('upper');
      expect(CaseTransformer.detectCase('BRB')).toBe('upper');
      expect(CaseTransformer.detectCase('TEST123')).toBe('upper');
    });

    it('should detect lowercase', () => {
      expect(CaseTransformer.detectCase('hello')).toBe('lower');
      expect(CaseTransformer.detectCase('brb')).toBe('lower');
      expect(CaseTransformer.detectCase('test')).toBe('lower');
    });

    it('should detect title case', () => {
      expect(CaseTransformer.detectCase('Hello World')).toBe('title');
      expect(CaseTransformer.detectCase('Be Right Back')).toBe('title');
      expect(CaseTransformer.detectCase('Test One Two')).toBe('title');
    });

    it('should detect capitalize', () => {
      expect(CaseTransformer.detectCase('Hello')).toBe('capitalize');
      expect(CaseTransformer.detectCase('Brb')).toBe('capitalize');
      expect(CaseTransformer.detectCase('Test')).toBe('capitalize');
    });

    it('should detect mixed case', () => {
      expect(CaseTransformer.detectCase('hELLo')).toBe('mixed');
      expect(CaseTransformer.detectCase('tEsT')).toBe('mixed');
    });

    it('should handle empty string', () => {
      expect(CaseTransformer.detectCase('')).toBe('lower');
    });

    it('should handle text with no letters', () => {
      expect(CaseTransformer.detectCase('123')).toBe('lower');
      expect(CaseTransformer.detectCase('...')).toBe('lower');
    });

    it('should handle single character', () => {
      // Single uppercase char is ambiguous - implementation treats as 'upper'
      // This is acceptable since it has no lowercase chars
      expect(CaseTransformer.detectCase('A')).toBe('upper');
      expect(CaseTransformer.detectCase('a')).toBe('lower');
    });
  });

  describe('transform - upper', () => {
    it('should transform to uppercase', () => {
      expect(CaseTransformer.transform('hello world', 'upper')).toBe('HELLO WORLD');
      expect(CaseTransformer.transform('be right back', 'upper')).toBe('BE RIGHT BACK');
    });

    it('should handle already uppercase text', () => {
      expect(CaseTransformer.transform('HELLO', 'upper')).toBe('HELLO');
    });

    it('should handle mixed case', () => {
      expect(CaseTransformer.transform('HeLLo WoRLd', 'upper')).toBe('HELLO WORLD');
    });
  });

  describe('transform - lower', () => {
    it('should transform to lowercase', () => {
      expect(CaseTransformer.transform('HELLO WORLD', 'lower')).toBe('hello world');
      expect(CaseTransformer.transform('BE RIGHT BACK', 'lower')).toBe('be right back');
    });

    it('should handle already lowercase text', () => {
      expect(CaseTransformer.transform('hello', 'lower')).toBe('hello');
    });

    it('should handle mixed case', () => {
      expect(CaseTransformer.transform('HeLLo WoRLd', 'lower')).toBe('hello world');
    });
  });

  describe('transform - title', () => {
    it('should transform to title case', () => {
      expect(CaseTransformer.transform('hello world', 'title')).toBe('Hello World');
      expect(CaseTransformer.transform('be right back', 'title')).toBe('Be Right Back');
    });

    it('should handle already title case', () => {
      expect(CaseTransformer.transform('Hello World', 'title')).toBe('Hello World');
    });

    it('should handle all uppercase', () => {
      expect(CaseTransformer.transform('HELLO WORLD', 'title')).toBe('Hello World');
    });

    it('should preserve multiple spaces', () => {
      expect(CaseTransformer.transform('hello  world', 'title')).toBe('Hello  World');
    });

    it('should handle single word', () => {
      expect(CaseTransformer.transform('hello', 'title')).toBe('Hello');
    });
  });

  describe('transform - capitalize', () => {
    it('should capitalize first letter only', () => {
      expect(CaseTransformer.transform('hello world', 'capitalize')).toBe('Hello world');
      expect(CaseTransformer.transform('be right back', 'capitalize')).toBe('Be right back');
    });

    it('should handle already capitalized', () => {
      expect(CaseTransformer.transform('Hello world', 'capitalize')).toBe('Hello world');
    });

    it('should handle all uppercase', () => {
      expect(CaseTransformer.transform('HELLO WORLD', 'capitalize')).toBe('Hello world');
    });

    it('should handle empty string', () => {
      expect(CaseTransformer.transform('', 'capitalize')).toBe('');
    });
  });

  describe('transform - match', () => {
    it('should match uppercase trigger', () => {
      const result = CaseTransformer.transform('be right back', 'match', 'BRB');
      expect(result).toBe('BE RIGHT BACK');
    });

    it('should match lowercase trigger', () => {
      const result = CaseTransformer.transform('BE RIGHT BACK', 'match', 'brb');
      expect(result).toBe('be right back');
    });

    it('should match capitalized trigger', () => {
      const result = CaseTransformer.transform('be right back', 'match', 'Brb');
      expect(result).toBe('Be right back');
    });

    it('should match title case trigger', () => {
      const result = CaseTransformer.transform('be right back', 'match', 'Be Right Back');
      expect(result).toBe('Be Right Back');
    });

    it('should return original if no trigger provided', () => {
      const result = CaseTransformer.transform('Hello World', 'match');
      expect(result).toBe('Hello World');
    });

    it('should return original for mixed case trigger', () => {
      const result = CaseTransformer.transform('hello world', 'match', 'bRb');
      expect(result).toBe('hello world');
    });
  });

  describe('transform - none', () => {
    it('should not transform text', () => {
      expect(CaseTransformer.transform('Hello World', 'none')).toBe('Hello World');
      expect(CaseTransformer.transform('HELLO', 'none')).toBe('HELLO');
      expect(CaseTransformer.transform('hello', 'none')).toBe('hello');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(CaseTransformer.transform('', 'upper')).toBe('');
      expect(CaseTransformer.transform('', 'lower')).toBe('');
      expect(CaseTransformer.transform('', 'title')).toBe('');
      expect(CaseTransformer.transform('', 'capitalize')).toBe('');
    });

    it('should handle strings with only punctuation', () => {
      expect(CaseTransformer.transform('...', 'upper')).toBe('...');
      expect(CaseTransformer.transform('!!!', 'title')).toBe('!!!');
    });

    it('should handle strings with numbers', () => {
      expect(CaseTransformer.transform('test123', 'upper')).toBe('TEST123');
      expect(CaseTransformer.transform('TEST123', 'lower')).toBe('test123');
      expect(CaseTransformer.transform('test 123 hello', 'title')).toBe('Test 123 Hello');
    });

    it('should handle newlines and special characters', () => {
      expect(CaseTransformer.transform('hello\nworld', 'title')).toBe('Hello\nWorld');
      expect(CaseTransformer.transform('test@example.com', 'upper')).toBe('TEST@EXAMPLE.COM');
    });

    it('should handle very long strings', () => {
      const longText = 'word '.repeat(100).trim();
      const result = CaseTransformer.transform(longText, 'title');
      expect(result.split(' ').every(w => w === 'Word')).toBe(true);
    });

    it('should handle single character strings', () => {
      expect(CaseTransformer.transform('a', 'upper')).toBe('A');
      expect(CaseTransformer.transform('A', 'lower')).toBe('a');
      expect(CaseTransformer.transform('a', 'capitalize')).toBe('A');
    });

    it('should handle unicode characters', () => {
      expect(CaseTransformer.transform('café', 'upper')).toBe('CAFÉ');
      expect(CaseTransformer.transform('CAFÉ', 'lower')).toBe('café');
    });

    it('should handle strings with only whitespace', () => {
      expect(CaseTransformer.transform('   ', 'upper')).toBe('   ');
      expect(CaseTransformer.transform('\n\t', 'title')).toBe('\n\t');
    });
  });
});
