import { Snippet } from './types';

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  snippet: Snippet | null = null;
  isEndOfWord = false;
}

export class SnippetTrie {
  private root: TrieNode = new TrieNode();
  private caseSensitive: boolean;

  constructor(caseSensitive = false) {
    this.caseSensitive = caseSensitive;
  }

  private normalizeKey(char: string): string {
    return this.caseSensitive ? char : char.toLowerCase();
  }

  insert(snippet: Snippet): void {
    if (!snippet.enabled) return;

    const trigger = this.caseSensitive ? snippet.trigger : snippet.trigger.toLowerCase();
    let node = this.root;

    for (const char of trigger) {
      const key = this.normalizeKey(char);
      if (!node.children.has(key)) {
        node.children.set(key, new TrieNode());
      }
      node = node.children.get(key)!;
    }

    node.isEndOfWord = true;
    node.snippet = snippet;
  }

  search(text: string): Snippet | null {
    const searchText = this.caseSensitive ? text : text.toLowerCase();
    let node = this.root;

    for (const char of searchText) {
      const key = this.normalizeKey(char);
      if (!node.children.has(key)) {
        return null;
      }
      node = node.children.get(key)!;
    }

    return node.isEndOfWord ? node.snippet : null;
  }

  // Find the longest matching snippet at the end of the buffer
  findMatch(buffer: string): { snippet: Snippet; matchLength: number } | null {
    if (buffer.length === 0) return null;

    // Search for triggers that end at the buffer's end position
    // For buffer "hello brb btw", try suffixes: "btw", "tw", "w", etc.
    // Return the longest match found

    let longestMatch: { snippet: Snippet; matchLength: number } | null = null;

    // Try all possible suffix lengths, from longest to shortest
    for (let length = buffer.length; length > 0; length--) {
      const suffix = buffer.substring(buffer.length - length);
      const snippet = this.search(suffix);

      if (snippet) {
        // Found a match - if it's longer than previous, keep it
        if (!longestMatch || length > longestMatch.matchLength) {
          longestMatch = { snippet, matchLength: length };
        }
      }
    }

    return longestMatch;
  }

  rebuild(snippets: Record<string, Snippet>): void {
    this.root = new TrieNode();
    Object.values(snippets).forEach(snippet => this.insert(snippet));
  }

  clear(): void {
    this.root = new TrieNode();
  }
}
