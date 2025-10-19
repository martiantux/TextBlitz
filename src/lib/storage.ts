import { Snippet, Settings, StorageData, DEFAULT_SETTINGS } from './types';

export class StorageManager {
  private static snippetCache: Record<string, Snippet> = {};
  private static settingsCache: Settings = DEFAULT_SETTINGS;
  private static initialized = false;
  private static initPromise: Promise<void> | null = null;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('StorageManager: Already initialized, skipping');
      return;
    }

    // Return existing init promise if initialization in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization and cache the promise
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private static async _doInitialize(): Promise<void> {
    // Defensive - prevent double init
    if (this.initialized) return;

    this.initialized = true;
    console.log('StorageManager: Starting initialization...');

    // Defensive check - is chrome.storage available?
    if (typeof chrome === 'undefined') {
      throw new Error('chrome API is not available');
    }
    if (!chrome.storage) {
      throw new Error('chrome.storage API is not available');
    }
    if (!chrome.storage.local) {
      throw new Error('chrome.storage.local API is not available');
    }

    console.log('StorageManager: ✅ chrome.storage.local is available');

    try {
      // Add timeout to prevent hanging forever
      const TIMEOUT_MS = 5000;

      const data = await Promise.race([
        chrome.storage.local.get(['snippets', 'settings']),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Storage get timed out after ' + TIMEOUT_MS + 'ms')), TIMEOUT_MS)
        )
      ]) as { snippets?: Record<string, Snippet>, settings?: Settings };

      // Backward compatibility: Add defaults to existing snippets
      const snippets = data.snippets || {};
      let needsUpdate = false;
      for (const snippet of Object.values(snippets)) {
        if (!snippet.triggerMode) {
          snippet.triggerMode = 'word';
          needsUpdate = true;
        }
        if (!snippet.label) {
          snippet.label = snippet.trigger; // Use trigger as label if missing
          needsUpdate = true;
        }
      }

      this.snippetCache = snippets;

      // Merge loaded settings with defaults to ensure all fields exist
      this.settingsCache = { ...DEFAULT_SETTINGS, ...data.settings };

      // Save updated snippets if we added triggerMode to any
      if (needsUpdate) {
        console.log('StorageManager: Updating snippets with triggerMode');
        await chrome.storage.local.set({ snippets: this.snippetCache });
      }

      console.log('StorageManager: Loaded', Object.keys(this.snippetCache).length, 'snippets');

      // Ensure default settings exist or update old settings with new fields
      if (!data.settings || JSON.stringify(Object.keys(data.settings)) !== JSON.stringify(Object.keys(DEFAULT_SETTINGS))) {
        console.log('StorageManager: Updating settings with new fields');
        await chrome.storage.local.set({ settings: this.settingsCache });
      }

      // Listen for changes from other contexts (options page, etc.)
      // This listener will NOT trigger for changes we make in this context
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          if (changes.snippets) {
            this.snippetCache = changes.snippets.newValue || {};
          }
          if (changes.settings) {
            this.settingsCache = changes.settings.newValue || DEFAULT_SETTINGS;
          }
        }
      });

      console.log('StorageManager: ✅ Initialized successfully');
    } catch (error) {
      this.initialized = false; // Reset on error
      this.initPromise = null; // Clear promise cache to allow retry
      console.error('StorageManager: ❌ Failed to initialize:', error);
      throw error;
    }
  }

  static async getSnippets(): Promise<Record<string, Snippet>> {
    if (!this.initialized) await this.initialize();
    return this.snippetCache;
  }

  static async getSnippet(id: string): Promise<Snippet | undefined> {
    if (!this.initialized) await this.initialize();
    return this.snippetCache[id];
  }

  static async saveSnippet(snippet: Snippet): Promise<void> {
    if (!this.initialized) await this.initialize();
    this.snippetCache[snippet.id] = snippet;
    await chrome.storage.local.set({ snippets: this.snippetCache });
  }

  static async deleteSnippet(id: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    delete this.snippetCache[id];
    await chrome.storage.local.set({ snippets: this.snippetCache });
  }

  static async getSettings(): Promise<Settings> {
    if (!this.initialized) await this.initialize();
    return this.settingsCache;
  }

  static async saveSettings(settings: Settings): Promise<void> {
    if (!this.initialized) await this.initialize();
    this.settingsCache = settings;
    await chrome.storage.local.set({ settings });
  }

  static async incrementUsage(id: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    const snippet = this.snippetCache[id];
    if (snippet) {
      snippet.usageCount++;
      snippet.lastUsed = Date.now();
      await this.saveSnippet(snippet);
    }
  }

  static async exportData(): Promise<StorageData> {
    if (!this.initialized) await this.initialize();
    return {
      snippets: this.snippetCache,
      settings: this.settingsCache,
    };
  }

  static async importData(data: Partial<StorageData>): Promise<void> {
    if (!this.initialized) await this.initialize();

    if (data.snippets) {
      this.snippetCache = { ...this.snippetCache, ...data.snippets };
      await chrome.storage.local.set({ snippets: this.snippetCache });
    }

    if (data.settings) {
      this.settingsCache = { ...this.settingsCache, ...data.settings };
      await chrome.storage.local.set({ settings: this.settingsCache });
    }
  }
}
