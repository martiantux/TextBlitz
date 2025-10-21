import { describe, it, expect } from 'vitest';
import { SnippetTrie } from '../../../src/lib/trie';
import { CommandParser } from '../../../src/lib/command-parser';
import { createSnippet } from '../../helpers';

describe('Performance Validation - Library Level', () => {
  it('should perform trie lookup on 150+ snippets efficiently', () => {
    const trie = new SnippetTrie();

    // Build trie with 150 snippets (realistic corpus size)
    for (let i = 0; i < 150; i++) {
      const trigger = `sn${i}`;
      const snippet = createSnippet(`id-${i}`, trigger, `expansion ${i}`);
      trie.insert(snippet);
    }

    // Measure trie.findMatch performance - realistic usage pattern
    const testBuffers = ['hello sn1', 'type sn42', 'test sn99'];

    const start = performance.now();
    let matchCount = 0;
    for (let i = 0; i < 500; i++) {
      for (const buffer of testBuffers) {
        const match = trie.findMatch(buffer);
        if (match) matchCount++;
      }
    }
    const elapsed = performance.now() - start;

    // Trie is O(n) where n = buffer length, searching through 150 snippets
    console.log(`✓ Trie: 1500 findMatch calls on 150 snippets in ${elapsed.toFixed(2)}ms (${matchCount} matches found)`);
    expect(matchCount).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100); // Should complete very quickly
  });

  it('should parse commands efficiently without execution', () => {
    // Static snippets with various commands - parsing should be very fast
    const testCases = [
      'Hello {cursor}',
      '{date:YYYY-MM-DD}',
      'Text{enter}More{tab}End',
      '{key:escape}',
      '{formtext:label=Name} {formmenu:label=Type;options=A,B}',
      '{clipboard}',
      '{time:12h}',
    ];

    const start = performance.now();
    let parseCount = 0;
    for (let i = 0; i < 200; i++) {
      for (const testCase of testCases) {
        CommandParser.parse(testCase);
        parseCount++;
      }
    }
    const elapsed = performance.now() - start;
    const avgPerParse = elapsed / parseCount;

    // Parser uses regex - should be microseconds per parse
    console.log(`✓ CommandParser: ${parseCount} parses in ${elapsed.toFixed(3)}ms (avg: ${avgPerParse.toFixed(4)}ms)`);
    expect(avgPerParse).toBeLessThan(1); // Should be well under 1ms per parse
  });

  it('should extract keyboard actions without DOM interaction', () => {
    const complexExpansion = 'Name{enter}Email{tab}Phone{tab}Message{enter}{delay +0.5s}{key:escape}';

    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      CommandParser.extractKeyboardActions(complexExpansion);
    }
    const elapsed = performance.now() - start;

    // This is parsing only, no actual key/DOM events
    console.log(`✓ extractKeyboardActions: 500 calls in ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(100);
  });

  it('should benchmark realistic static snippet expansion (no LLM)', () => {
    // A realistic static snippet with multiple features
    const staticSnippet = {
      trigger: 'eml',
      expansion: 'Email: {clipboard}, Sent: {date:YYYY-MM-DD} {time:12h}, Status: {cursor}',
    };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      // In real usage, this would also execute date/time/clipboard commands
      CommandParser.parse(staticSnippet.expansion);
    }
    const elapsed = performance.now() - start;

    console.log(`✓ Static snippet parse (1000x): ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(200); // 0.2ms average per expansion parse
  });
});
