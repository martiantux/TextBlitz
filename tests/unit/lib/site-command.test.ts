import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandParser } from '../../../src/lib/command-parser';

describe('CommandParser - {site} command', () => {
  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com',
        href: 'https://example.com/page?test=1',
      },
      writable: true,
    });

    // Mock document.title
    Object.defineProperty(document, 'title', {
      value: 'Test Page Title',
      writable: true,
    });

    // Mock window.getSelection
    window.getSelection = vi.fn(() => ({
      toString: () => 'selected text',
    }) as any);
  });

  describe('getSiteInfo', () => {
    it('should return domain for "domain" parameter', () => {
      const result = CommandParser.getSiteInfo('domain');
      expect(result).toBe('example.com');
    });

    it('should return title for "title" parameter', () => {
      const result = CommandParser.getSiteInfo('title');
      expect(result).toBe('Test Page Title');
    });

    it('should return url for "url" parameter', () => {
      const result = CommandParser.getSiteInfo('url');
      expect(result).toBe('https://example.com/page?test=1');
    });

    it('should return selection for "selection" parameter', () => {
      const result = CommandParser.getSiteInfo('selection');
      expect(result).toBe('selected text');
    });

    it('should return empty string for no selection', () => {
      window.getSelection = vi.fn(() => ({
        toString: () => '',
      }) as any);
      const result = CommandParser.getSiteInfo('selection');
      expect(result).toBe('');
    });

    it('should handle null selection', () => {
      window.getSelection = vi.fn(() => null);
      const result = CommandParser.getSiteInfo('selection');
      expect(result).toBe('');
    });

    it('should be case-insensitive', () => {
      expect(CommandParser.getSiteInfo('DOMAIN')).toBe('example.com');
      expect(CommandParser.getSiteInfo('Title')).toBe('Test Page Title');
      expect(CommandParser.getSiteInfo('URL')).toBe('https://example.com/page?test=1');
    });

    it('should trim whitespace from parameter', () => {
      expect(CommandParser.getSiteInfo(' domain ')).toBe('example.com');
      expect(CommandParser.getSiteInfo('  title  ')).toBe('Test Page Title');
    });

    it('should return empty string for unknown parameter', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = CommandParser.getSiteInfo('unknown');
      expect(result).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown site parameter: unknown')
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('processCommands with {site}', () => {
    it('should process {site: domain} command', async () => {
      const input = 'Working on {site: domain}';
      const result = await CommandParser.processCommands(input);
      expect(result).toBe('Working on example.com');
    });

    it('should process {site: title} command', async () => {
      const input = 'Page: {site: title}';
      const result = await CommandParser.processCommands(input);
      expect(result).toBe('Page: Test Page Title');
    });

    it('should process {site: url} command', async () => {
      const input = 'Link: {site: url}';
      const result = await CommandParser.processCommands(input);
      expect(result).toBe('Link: https://example.com/page?test=1');
    });

    it('should process {site: selection} command', async () => {
      const input = 'Selected: {site: selection}';
      const result = await CommandParser.processCommands(input);
      expect(result).toBe('Selected: selected text');
    });

    it('should default to url if no parameter given', async () => {
      const input = 'Link: {site}';
      const result = await CommandParser.processCommands(input);
      expect(result).toBe('Link: https://example.com/page?test=1');
    });

    it('should handle multiple site commands', async () => {
      const input = '{site: domain} - {site: title}';
      const result = await CommandParser.processCommands(input);
      expect(result).toBe('example.com - Test Page Title');
    });

    it('should work with other commands', async () => {
      const input = 'Domain: {site: domain}, Time: {time: 24h}';
      const result = await CommandParser.processCommands(input);
      expect(result).toContain('Domain: example.com, Time:');
    });

    it('should handle site command in complex snippets', async () => {
      const input = `Report for {site: title}
URL: {site: url}
Domain: {site: domain}`;
      const result = await CommandParser.processCommands(input);
      expect(result).toContain('Report for Test Page Title');
      expect(result).toContain('URL: https://example.com/page?test=1');
      expect(result).toContain('Domain: example.com');
    });

    it('should handle empty selection gracefully', async () => {
      window.getSelection = vi.fn(() => ({
        toString: () => '',
      }) as any);
      const input = 'Text: "{site: selection}"';
      const result = await CommandParser.processCommands(input);
      expect(result).toBe('Text: ""');
    });
  });

  describe('parse with {site} command', () => {
    it('should parse site command', () => {
      const commands = CommandParser.parse('{site: domain}');
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe('site');
      expect(commands[0].options).toBe('domain');
    });

    it('should parse site command without options', () => {
      const commands = CommandParser.parse('{site}');
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe('site');
      expect(commands[0].options).toBeUndefined();
    });

    it('should parse multiple site commands', () => {
      const commands = CommandParser.parse('{site: domain} {site: title}');
      expect(commands).toHaveLength(2);
      expect(commands[0].options).toBe('domain');
      expect(commands[1].options).toBe('title');
    });
  });

  describe('real-world use cases', () => {
    it('should create customer service snippet with context', async () => {
      const input = `Thank you for contacting us about {site: title}.

I see you're on {site: url}.

{site: selection}

Let me help you with this.`;
      const result = await CommandParser.processCommands(input);
      expect(result).toContain('Thank you for contacting us about Test Page Title');
      expect(result).toContain("I see you're on https://example.com/page?test=1");
      expect(result).toContain('selected text');
    });

    it('should create bug report with site info', async () => {
      const input = `Bug Report:
Page: {site: title}
URL: {site: url}
Domain: {site: domain}

Issue: {site: selection}`;
      const result = await CommandParser.processCommands(input);
      expect(result).toContain('Page: Test Page Title');
      expect(result).toContain('URL: https://example.com/page?test=1');
      expect(result).toContain('Domain: example.com');
      expect(result).toContain('Issue: selected text');
    });
  });
});
