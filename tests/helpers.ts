import type { Snippet, TriggerMode, SnippetType, CaseTransform } from '../src/lib/types';

export const createSnippet = (
  id: string,
  trigger: string,
  expansion: string = 'test expansion',
  overrides: Partial<Snippet> = {}
): Snippet => ({
  id,
  trigger,
  expansion,
  enabled: true,
  label: overrides.label || 'Test Snippet',
  folder: 'all',
  triggerMode: 'word' as TriggerMode,
  type: 'static' as SnippetType,
  caseSensitive: false,
  caseTransform: 'none' as CaseTransform,
  createdAt: Date.now(),
  usageCount: 0,
  ...overrides,
});
