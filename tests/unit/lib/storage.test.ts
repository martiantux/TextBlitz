import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../../../src/lib/storage';
import { createSnippet } from '../../helpers';

describe('StorageManager', () => {
  beforeEach(async () => {
    // Reset StorageManager state between tests
    (StorageManager as any).initialized = false;
    (StorageManager as any).initPromise = null;
    (StorageManager as any).snippetCache = {};
    (StorageManager as any).settingsCache = {};

    // Setup default chrome.storage mock responses
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      snippets: {},
      settings: {},
    });
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const mockSnippets = {
        '1': createSnippet('1', 'brb', 'be right back'),
      };
      const mockSettings = { enabled: true };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: mockSnippets,
        settings: mockSettings,
      });

      await StorageManager.initialize();

      const snippets = await StorageManager.getSnippets();
      const settings = await StorageManager.getSettings();

      expect(snippets).toEqual(mockSnippets);
      expect(settings).toMatchObject(mockSettings);
    });

    it('should only initialize once', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: {},
        settings: {},
      });

      await StorageManager.initialize();
      await StorageManager.initialize();
      await StorageManager.initialize();

      // Should only call storage once
      expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent initialization calls', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: {},
        settings: {},
      });

      // Start multiple initializations simultaneously
      const promises = [
        StorageManager.initialize(),
        StorageManager.initialize(),
        StorageManager.initialize(),
      ];

      await Promise.all(promises);

      // Should still only call storage once due to promise caching
      expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
    });

    it('should add default triggerMode to old snippets', async () => {
      const oldSnippet = createSnippet('1', 'brb', 'be right back');
      delete (oldSnippet as any).triggerMode;

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: { '1': oldSnippet },
        settings: {},
      });

      await StorageManager.initialize();

      // Should have called set to update snippets
      expect(chrome.storage.local.set).toHaveBeenCalled();

      const snippets = await StorageManager.getSnippets();
      expect(snippets['1'].triggerMode).toBe('word');
    });

    it('should add default label if missing', async () => {
      const oldSnippet = createSnippet('1', 'brb', 'be right back');
      delete (oldSnippet as any).label;

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: { '1': oldSnippet },
        settings: {},
      });

      await StorageManager.initialize();

      const snippets = await StorageManager.getSnippets();
      expect(snippets['1'].label).toBe('brb');
    });

    it('should merge settings with defaults', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: {},
        settings: { enabled: false },
      });

      await StorageManager.initialize();

      const settings = await StorageManager.getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.debugMode).toBeDefined();
      expect(settings.llmKeys).toBeDefined();
    });
  });

  describe('getSnippets', () => {
    it('should return cached snippets after initialization', async () => {
      const mockSnippets = {
        '1': createSnippet('1', 'brb', 'be right back'),
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: mockSnippets,
        settings: {},
      });

      await StorageManager.initialize();
      const snippets = await StorageManager.getSnippets();

      expect(snippets).toEqual(mockSnippets);
    });
  });

  describe('saveSnippet', () => {
    it('should save snippet to storage and cache', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: {},
        settings: {},
      });

      await StorageManager.initialize();

      const snippet = createSnippet('1', 'brb', 'be right back');
      await StorageManager.saveSnippet(snippet);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        snippets: expect.objectContaining({ '1': snippet }),
      });

      const snippets = await StorageManager.getSnippets();
      expect(snippets['1']).toEqual(snippet);
    });

    it('should update existing snippet', async () => {
      const existingSnippet = createSnippet('1', 'brb', 'be right back');

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: { '1': existingSnippet },
        settings: {},
      });

      await StorageManager.initialize();

      const updatedSnippet = { ...existingSnippet, expansion: 'updated text' };
      await StorageManager.saveSnippet(updatedSnippet);

      const snippets = await StorageManager.getSnippets();
      expect(snippets['1'].expansion).toBe('updated text');
    });
  });

  describe('deleteSnippet', () => {
    it('should remove snippet from storage and cache', async () => {
      const snippet = createSnippet('1', 'brb', 'be right back');

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: { '1': snippet },
        settings: {},
      });

      await StorageManager.initialize();
      await StorageManager.deleteSnippet('1');

      expect(chrome.storage.local.set).toHaveBeenCalled();

      const snippets = await StorageManager.getSnippets();
      expect(snippets['1']).toBeUndefined();
    });
  });

  describe('saveSettings', () => {
    it('should save settings to storage and cache', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: {},
        settings: {},
      });

      await StorageManager.initialize();

      const newSettings = { enabled: false, debugMode: true };
      await StorageManager.saveSettings(newSettings as any);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: expect.objectContaining(newSettings),
      });

      const settings = await StorageManager.getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.debugMode).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty storage', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      await StorageManager.initialize();

      const snippets = await StorageManager.getSnippets();
      const settings = await StorageManager.getSettings();

      expect(snippets).toEqual({});
      expect(settings).toBeDefined();
      expect(settings.enabled).toBe(true);
    });

    it('should handle storage with null values', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        snippets: null,
        settings: null,
      } as any);

      await StorageManager.initialize();

      const snippets = await StorageManager.getSnippets();
      expect(snippets).toEqual({});
    });
  });
});
