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
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  if (message.type === 'PROCESS_SNIPPET') {
    handleProcessSnippet(message)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }

  if (message.type === 'INJECT_CKEDITOR_SCRIPT') {
    handleCKEditorInjection(message, sender)
      .then(result => sendResponse(result))
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

// Handle CKEditor script injection into MAIN world
async function handleCKEditorInjection(message: any, sender: chrome.runtime.MessageSender) {
  try {
    if (!sender.tab?.id) {
      throw new Error('No tab ID available');
    }

    const { targetId, trigger, expansion } = message;

    // Inject script into MAIN world to access CKEditor instance
    const results = await chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      args: [targetId, trigger, expansion],
      func: (targetId: string, trigger: string, expansion: string) => {
        try {
          // Find element by data attribute
          const element = document.querySelector(`[data-textblitz-target="${targetId}"]`) as any;
          if (!element) {
            return { success: false, error: 'Element not found' };
          }

          // Find CKEditor instance
          let editorInstance = element.ckeditorInstance;
          if (!editorInstance) {
            // Try parent elements
            let parent = element.parentElement;
            while (parent && !editorInstance) {
              editorInstance = (parent as any).ckeditorInstance;
              parent = parent.parentElement;
            }
          }

          if (!editorInstance) {
            return { success: false, error: 'CKEditor instance not found' };
          }

          // Use CKEditor model API
          const model = editorInstance.model;
          const selection = model.document.selection;

          model.change((writer: any) => {
            const position = selection.getFirstPosition();

            // Get text before cursor
            const range = model.createRange(
              model.createPositionAt(position.root, 0),
              position
            );

            let textBefore = '';
            for (const item of range.getItems()) {
              if (item.is('$textProxy')) {
                textBefore += item.data;
              }
            }

            // Check if trigger is at the end
            if (!textBefore.endsWith(trigger)) {
              throw new Error('Trigger not found at cursor');
            }

            // Delete trigger and insert expansion
            const triggerLength = trigger.length;
            const deletePosition = model.createPositionAt(
              position.root,
              position.offset - triggerLength
            );

            const deleteRange = model.createRange(deletePosition, position);
            writer.remove(deleteRange);
            writer.insertText(expansion, deletePosition);

            // Move cursor
            const newPosition = model.createPositionAt(
              position.root,
              deletePosition.offset + expansion.length
            );
            writer.setSelection(newPosition);
          });

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }
    });

    return results[0]?.result || { success: false, error: 'No result' };
  } catch (error: any) {
    console.error('TextBlitz: CKEditor injection error:', error);
    return { success: false, error: error.message };
  }
}

export {};
