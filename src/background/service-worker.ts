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

// Offscreen document management
let offscreenCreated = false;

async function createOffscreenDocument() {
  if (offscreenCreated) return;

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['CLIPBOARD' as chrome.offscreen.Reason],
      justification: 'Process snippet expansions with clipboard and command parsing'
    });
    offscreenCreated = true;
    console.log('TextBlitz: Offscreen document created');
  } catch (error) {
    console.error('TextBlitz: Failed to create offscreen document', error);
  }
}

async function ensureOffscreenDocument() {
  // Check if offscreen document exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
  });

  if (existingContexts.length === 0) {
    offscreenCreated = false;
    await createOffscreenDocument();
  }
}

// Message types
interface ProcessSnippetRequest {
  type: 'PROCESS_SNIPPET';
  expansion: string;
  trigger: string;
  caseTransform?: string;
  messageId: string;
}

type MessageRequest = ProcessSnippetRequest;

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message: MessageRequest, sender, sendResponse) => {
  if (message.type === 'PROCESS_SNIPPET') {
    handleProcessSnippet(message)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
  return true;
});

async function handleProcessSnippet(message: ProcessSnippetRequest) {
  // Ensure offscreen document exists
  await ensureOffscreenDocument();

  // Forward message to offscreen document
  const response = await chrome.runtime.sendMessage(message);
  return response;
}

export {};
