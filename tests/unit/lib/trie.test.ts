import { describe, it, expect } from 'vitest';
import { SnippetTrie } from '../../../src/lib/trie';
import { createSnippet } from '../../helpers';

describe('SnippetTrie', () => {
  describe('insert and search', () => {
    it('should insert and find basic trigger', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back');

      trie.insert(snippet);

      const result = trie.search('brb');
      expect(result).toEqual(snippet);
    });

    it('should be case-insensitive for trie lookups', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back');

      trie.insert(snippet);

      expect(trie.search('BRB')).toEqual(snippet);
      expect(trie.search('Brb')).toEqual(snippet);
      expect(trie.search('bRb')).toEqual(snippet);
    });

    it('should not find non-existent trigger', () => {
      const trie = new SnippetTrie();

      expect(trie.search('xyz')).toBeNull();
    });

    it('should skip disabled snippets', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back', { enabled: false });

      trie.insert(snippet);

      expect(trie.search('brb')).toBeNull();
    });

    it('should handle empty trigger', () => {
      const trie = new SnippetTrie();

      expect(trie.search('')).toBeNull();
    });

    it('should handle multiple different triggers', () => {
      const trie = new SnippetTrie();
      const snippet1 = createSnippet('1', 'brb', 'be right back');
      const snippet2 = createSnippet('2', 'btw', 'by the way');

      trie.insert(snippet1);
      trie.insert(snippet2);

      expect(trie.search('brb')).toEqual(snippet1);
      expect(trie.search('btw')).toEqual(snippet2);
    });
  });

  describe('findMatch', () => {
    it('should find trigger at end of buffer', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back');
      trie.insert(snippet);

      const result = trie.findMatch('hello brb');

      expect(result).not.toBeNull();
      expect(result!.snippet).toEqual(snippet);
      expect(result!.matchLength).toBe(3);
    });

    it('should find longest match when multiple triggers overlap', () => {
      const trie = new SnippetTrie();
      const snippet1 = createSnippet('1', 'br', 'Brazil');
      const snippet2 = createSnippet('2', 'brb', 'be right back');

      trie.insert(snippet1);
      trie.insert(snippet2);

      const result = trie.findMatch('hello brb');

      expect(result!.snippet.id).toBe('2');
      expect(result!.matchLength).toBe(3);
    });

    it('should return null for no match', () => {
      const trie = new SnippetTrie();

      expect(trie.findMatch('hello')).toBeNull();
    });

    it('should return null for empty buffer', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back');
      trie.insert(snippet);

      expect(trie.findMatch('')).toBeNull();
    });

    it('should handle buffer with only the trigger', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back');
      trie.insert(snippet);

      const result = trie.findMatch('brb');

      expect(result!.snippet).toEqual(snippet);
      expect(result!.matchLength).toBe(3);
    });

    it('should be case-insensitive for buffer matching', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back');
      trie.insert(snippet);

      const result1 = trie.findMatch('hello BRB');
      const result2 = trie.findMatch('hello Brb');

      expect(result1!.snippet).toEqual(snippet);
      expect(result2!.snippet).toEqual(snippet);
    });
  });

  describe('rebuild', () => {
    it('should rebuild trie from snippet record', () => {
      const trie = new SnippetTrie();
      const snippets = {
        '1': createSnippet('1', 'brb', 'be right back'),
        '2': createSnippet('2', 'btw', 'by the way'),
      };

      trie.rebuild(snippets);

      expect(trie.search('brb')).toEqual(snippets['1']);
      expect(trie.search('btw')).toEqual(snippets['2']);
    });

    it('should clear existing data when rebuilding', () => {
      const trie = new SnippetTrie();
      const oldSnippet = createSnippet('old', 'old', 'old snippet');
      trie.insert(oldSnippet);

      const newSnippets = {
        '1': createSnippet('1', 'brb', 'be right back'),
      };
      trie.rebuild(newSnippets);

      expect(trie.search('old')).toBeNull();
      expect(trie.search('brb')).toEqual(newSnippets['1']);
    });

    it('should handle empty snippet record', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back');
      trie.insert(snippet);

      trie.rebuild({});

      expect(trie.search('brb')).toBeNull();
    });

    it('should skip disabled snippets during rebuild', () => {
      const trie = new SnippetTrie();
      const snippets = {
        '1': createSnippet('1', 'brb', 'be right back', { enabled: false }),
      };

      trie.rebuild(snippets);

      expect(trie.search('brb')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all snippets', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'brb', 'be right back');
      trie.insert(snippet);

      trie.clear();

      expect(trie.search('brb')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle very long triggers', () => {
      const trie = new SnippetTrie();
      const longTrigger = 'a'.repeat(100);
      const snippet = createSnippet('1', longTrigger, 'long expansion');

      trie.insert(snippet);

      expect(trie.search(longTrigger)).toEqual(snippet);
    });

    it('should handle triggers with numbers', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'test123', 'test expansion');

      trie.insert(snippet);

      expect(trie.search('test123')).toEqual(snippet);
    });

    it('should handle triggers with special characters', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'test@email', 'test@example.com');

      trie.insert(snippet);

      expect(trie.search('test@email')).toEqual(snippet);
    });

    it('should handle single character triggers', () => {
      const trie = new SnippetTrie();
      const snippet = createSnippet('1', 'x', 'expanded x');

      trie.insert(snippet);

      expect(trie.search('x')).toEqual(snippet);
    });

    it('should handle prefix overlaps correctly', () => {
      const trie = new SnippetTrie();
      const snippet1 = createSnippet('1', 'test', 'test expansion');
      const snippet2 = createSnippet('2', 'testing', 'testing expansion');

      trie.insert(snippet1);
      trie.insert(snippet2);

      expect(trie.search('test')).toEqual(snippet1);
      expect(trie.search('testing')).toEqual(snippet2);
    });
  });
});
