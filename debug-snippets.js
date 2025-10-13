// DEBUG SCRIPT FOR TEXTBLITZ
// Copy and paste this into the Chrome console on ANY webpage to:
// 1. Check what's in storage
// 2. Add test snippets manually
// 3. Verify TextBlitz is working

console.log('=== TextBlitz Debug Script ===');

// Check current storage
chrome.storage.local.get(['snippets', 'settings'], (result) => {
  console.log('Current Storage:', result);

  if (!result.snippets || Object.keys(result.snippets).length === 0) {
    console.log('❌ NO SNIPPETS FOUND - Adding test snippets...');

    const testSnippets = {
      'test-btw': {
        id: 'test-btw',
        trigger: 'btw',
        expansion: 'by the way',
        caseSensitive: false,
        enabled: true,
        createdAt: Date.now(),
        usageCount: 0,
      },
      'test-thx': {
        id: 'test-thx',
        trigger: 'thx',
        expansion: 'thank you',
        caseSensitive: false,
        enabled: true,
        createdAt: Date.now(),
        usageCount: 0,
      },
      'test-brb': {
        id: 'test-brb',
        trigger: 'brb',
        expansion: 'be right back',
        caseSensitive: false,
        enabled: true,
        createdAt: Date.now(),
        usageCount: 0,
      },
      'test-omg': {
        id: 'test-omg',
        trigger: 'omg',
        expansion: 'oh my god',
        caseSensitive: false,
        enabled: true,
        createdAt: Date.now(),
        usageCount: 0,
      },
    };

    const defaultSettings = {
      enabled: true,
      delimiter: ' ',
      expandOnDelimiter: true,
      caseSensitive: false,
    };

    chrome.storage.local.set({ snippets: testSnippets, settings: defaultSettings }, () => {
      console.log('✅ Test snippets added!');
      console.log('📝 Snippets:', testSnippets);
      console.log('⚙️ Settings:', defaultSettings);
      console.log('\n🔄 Reload the page to activate TextBlitz');
      console.log('💡 Then try typing: btw, thx, brb, or omg followed by a space');
    });
  } else {
    console.log('✅ Snippets found:', Object.keys(result.snippets).length);
    console.log('📝 Snippets:', result.snippets);
    console.log('⚙️ Settings:', result.settings);
  }
});
