export type TriggerMode = 'word' | 'word-both' | 'anywhere';
export type SnippetType = 'static' | 'dynamic';
export type LLMProvider = 'groq' | 'anthropic' | 'openai' | 'gemini';
export type FormFieldType = 'text' | 'paragraph' | 'menu' | 'date' | 'toggle';

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

export interface Settings {
  enabled: boolean;
  delimiter: string;
  expandOnDelimiter: boolean;
  caseSensitive: boolean;
  debugMode: boolean;
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
  llmUsageAlert?: number; // Alert threshold percentage (e.g., 80 = alert at 80%)
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
  llmKeys: {},
  llmDefaultProvider: 'groq',
  llmTimeout: 5000,
  llmMaxTokens: 100,
};
