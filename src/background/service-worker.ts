import { StorageManager } from '../lib/storage';

// Initialize storage when extension is installed
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('TextBlitz: Extension installed');

    // Initialize with some example snippets
    await StorageManager.initialize();

    const exampleSnippets = {
      'example-1': {
        id: 'example-1',
        label: 'By The Way',
        trigger: 'btw',
        expansion: 'by the way',
        caseSensitive: false,
        enabled: true,
        triggerMode: 'word' as const,
        createdAt: Date.now(),
        usageCount: 0,
        type: 'static' as const,
      },
      'example-2': {
        id: 'example-2',
        label: 'Thank You',
        trigger: 'thx',
        expansion: 'thank you',
        caseSensitive: false,
        enabled: true,
        triggerMode: 'word' as const,
        createdAt: Date.now(),
        usageCount: 0,
        type: 'static' as const,
      },
      'example-3': {
        id: 'example-3',
        label: 'Be Right Back',
        trigger: 'brb',
        expansion: 'be right back',
        caseSensitive: false,
        enabled: true,
        triggerMode: 'word' as const,
        createdAt: Date.now(),
        usageCount: 0,
        type: 'static' as const,
      },
    };

    // Save example snippets
    for (const snippet of Object.values(exampleSnippets)) {
      await StorageManager.saveSnippet(snippet);
    }

    console.log('TextBlitz: Example snippets created');
  }
});

// Keep service worker alive
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle any messages from content scripts or popup
  return true;
});

export {};
