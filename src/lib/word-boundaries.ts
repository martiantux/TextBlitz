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
  if (!char || char.length === 0) return true;
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
      // "btw" only works when surrounded: " btw " or at boundaries
      return isWordBoundary(charBefore) && isWordBoundary(charAfter);

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
