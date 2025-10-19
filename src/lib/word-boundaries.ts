import { TriggerMode } from './types';

const WORD_BOUNDARY_CHARS = new Set([
  ' ', '\t', '\n', '\r',
  '.', ',', ';', ':', '!', '?',
  '-', '_',
  '(', ')', '[', ']', '{', '}',
  '"', "'",
  '/', '\\', '|', '<', '>',
]);

export function isWordBoundary(char: string | undefined): boolean {
  if (char === undefined) return true; // Start or end of text
  if (char.length === 0) return true; // Empty string edge case
  return WORD_BOUNDARY_CHARS.has(char);
}

export function shouldTriggerMatch(
  textBefore: string,
  trigger: string,
  textAfter: string,
  triggerMode: TriggerMode
): boolean {
  const charBefore = textBefore.length > 0 ? textBefore[textBefore.length - 1] : undefined;
  const charAfter = textAfter.length > 0 ? textAfter[0] : undefined;

  switch (triggerMode) {
    case 'anywhere':
      return true;

    case 'word':
      // Started by word break - trigger must start a new word
      // "btw" works in " btw" or at start, but not "xbtw"
      return isWordBoundary(charBefore);

    case 'word-both':
      // Started AND ended by word break - trigger must be isolated word
      // "btw " works (with space after), "btw" alone doesn't (end of text)
      // Start-of-text is OK, but end-of-text requires actual delimiter
      const beforeBoundary = isWordBoundary(charBefore);
      const afterBoundary = charAfter !== undefined && isWordBoundary(charAfter);
      return beforeBoundary && afterBoundary;

    default:
      console.warn('Unknown trigger mode:', triggerMode);
      return false;
  }
}

export function extractTriggerContext(
  fullText: string,
  triggerEndPos: number,
  triggerLength: number
): { textBefore: string; trigger: string; textAfter: string } {
  const triggerStartPos = triggerEndPos - triggerLength;
  return {
    textBefore: fullText.substring(0, triggerStartPos),
    trigger: fullText.substring(triggerStartPos, triggerEndPos),
    textAfter: fullText.substring(triggerEndPos),
  };
}
