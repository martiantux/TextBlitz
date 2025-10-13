export type TriggerMode = 'word' | 'word-both' | 'anywhere';
export type SnippetType = 'static' | 'dynamic';
export type LLMProvider = 'groq' | 'anthropic' | 'openai' | 'gemini';
export type FormFieldType = 'text' | 'paragraph' | 'menu' | 'date' | 'toggle';
export type CaseTransform = 'none' | 'upper' | 'lower' | 'title' | 'capitalize' | 'match';

export interface FormField {
  type: FormFieldType;
  name: string;
  label: string;
  options?: string[]; // For menu type
  defaultValue?: string | boolean;
  required?: boolean;
}

export interface FormData {
  [key: string]: string | boolean;
}

export interface Snippet {
  id: string;
  label: string; // Friendly display name
  trigger: string;
  expansion: string;
  caseSensitive: boolean;
  enabled: boolean;
  triggerMode: TriggerMode; // How the trigger should match
  caseTransform?: CaseTransform; // How to transform expansion case
  createdAt: number;
  lastUsed?: number;
  usageCount: number;
  folder?: string;
  // LLM fields
  type: SnippetType; // static or dynamic
  llmProvider?: LLMProvider;
  llmPrompt?: string; // For dynamic snippets
  fallbackText?: string; // Used if LLM fails
}

export interface ProviderUsageStats {
  requests: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  estimatedCost: number;
  lastReset: number;
  requestsThisMinute: number;
  minuteWindowStart: number;
}

export interface LLMUsageStats {
  groq?: ProviderUsageStats;
  anthropic?: ProviderUsageStats;
  openai?: ProviderUsageStats;
  gemini?: ProviderUsageStats;
  monthStart?: number; // Track monthly usage for limits
}

export interface CustomFolder {
  id: string;
  name: string;
  icon: string; // Emoji
  order: number;
}

export interface Settings {
  enabled: boolean;
  delimiter: string;
  expandOnDelimiter: boolean;
  caseSensitive: boolean;
  debugMode: boolean;
  darkMode?: 'light' | 'dark' | 'system'; // Theme preference
  customFolders?: CustomFolder[]; // User-created folders
  lastUsedFolder?: string; // Remember last folder for new snippets
  // LLM settings
  llmKeys: {
    groq?: string;
    anthropic?: string;
    openai?: string;
    gemini?: string;
  };
  llmDefaultProvider: LLMProvider;
  llmTimeout: number;
  llmMaxTokens: number;
  llmSystemPrompt?: string; // Universal system instructions
  llmUsageLimit?: number; // Monthly request limit (0 = unlimited)
  llmUsageAlert: number; // Alert threshold percentage (default 80)
  // Model and tier configuration
  llmModels: {
    groq?: string;
    anthropic?: string;
    openai?: string;
    gemini?: string;
  };
  llmTiers: {
    groq?: 'free' | 'paid';
    openai?: 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';
    anthropic?: 'tier1' | 'tier2' | 'tier3' | 'tier4';
    gemini?: 'free' | 'paid';
  };
  // Custom rate limit overrides (advanced)
  llmCustomLimits?: {
    [provider: string]: {
      requestsPerMinute?: number;
      tokensPerMinute?: number;
      requestsPerDay?: number;
    };
  };
  llmMonthlyBudget?: number; // USD alert threshold
}

export interface StorageData {
  snippets: Record<string, Snippet>;
  settings: Settings;
  llmUsage?: LLMUsageStats;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  delimiter: ' ',
  expandOnDelimiter: true,
  caseSensitive: false,
  debugMode: false,
  darkMode: 'system',
  customFolders: [],
  llmKeys: {},
  llmDefaultProvider: 'groq',
  llmTimeout: 5000,
  llmMaxTokens: 100,
  llmUsageAlert: 80,
  llmModels: {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash-exp',
  },
  llmTiers: {
    groq: 'free',
    openai: 'tier1',
    anthropic: 'tier1',
    gemini: 'free',
  },
};
