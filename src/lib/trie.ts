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

  // Find the longest matching snippet from the end of the buffer
  findMatch(buffer: string): { snippet: Snippet; matchLength: number } | null {
    if (buffer.length === 0) return null;

    // Try matching from the end of the buffer, working backwards
    // For buffer "hello brb ", we want to try:
    // "hello brb " -> "ello brb " -> "llo brb " -> ... -> "brb " -> "rb " -> "b " -> " "
    // We want to find "brb" at the end (before the space)

    for (let startIdx = 0; startIdx <= buffer.length; startIdx++) {
      const substring = buffer.substring(startIdx).trim();
      if (substring.length === 0) continue;

      const snippet = this.search(substring);
      if (snippet) {
        return { snippet, matchLength: substring.length };
      }
    }

    return null;
  }

  rebuild(snippets: Record<string, Snippet>): void {
    this.root = new TrieNode();
    Object.values(snippets).forEach(snippet => this.insert(snippet));
  }

  clear(): void {
    this.root = new TrieNode();
  }
}
