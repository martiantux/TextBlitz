import { CommandParser } from '../lib/command-parser';
import { CaseTransformer } from '../lib/case-transform';
import { CaseTransform } from '../lib/types';

console.log('TextBlitz: Offscreen document initialized');

// Message types
interface ProcessSnippetMessage {
  type: 'PROCESS_SNIPPET';
  expansion: string;
  trigger: string;
  caseTransform?: CaseTransform;
  messageId: string;
}

type OffscreenMessage = ProcessSnippetMessage;

// Listen for messages from background worker
chrome.runtime.onMessage.addListener((message: OffscreenMessage, sender, sendResponse) => {
  if (message.type === 'PROCESS_SNIPPET') {
    handleProcessSnippet(message)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
});

async function handleProcessSnippet(message: ProcessSnippetMessage) {
  const { expansion, trigger, caseTransform } = message;

  // Process commands (date, time, clipboard, etc.)
  let processedExpansion = await CommandParser.processCommands(expansion);

  // Apply case transformation
  if (caseTransform && caseTransform !== 'none') {
    processedExpansion = CaseTransformer.transform(processedExpansion, caseTransform, trigger);
  }

  // Parse cursor position
  const cursorMarker = '{cursor}';
  const cursorIndex = processedExpansion.indexOf(cursorMarker);
  let cursorOffset = processedExpansion.length;

  if (cursorIndex !== -1) {
    processedExpansion = processedExpansion.slice(0, cursorIndex) + processedExpansion.slice(cursorIndex + cursorMarker.length);
    cursorOffset = cursorIndex;
  }

  // Split by keyboard actions (we'll handle these in content script)
  const { chunks, actions } = CommandParser.splitTextByKeyboardActions(processedExpansion);

  return {
    text: chunks.join(''), // For now, join chunks (keyboard actions handled separately)
    cursorOffset,
    chunks,
    actions
  };
}
