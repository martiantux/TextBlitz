// LLM provider types and interfaces

export type LLMProvider = 'groq' | 'anthropic' | 'openai' | 'gemini';

export type GroqTier = 'free' | 'paid';
export type OpenAITier = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';
export type AnthropicTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type GeminiTier = 'free' | 'paid';

export interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  provider: LLMProvider;
}

export interface LLMProviderConfig {
  apiKey: string;
  model?: string;
  timeout?: number;
  systemPrompt?: string;
}

export interface UsageStats {
  provider: LLMProvider;
  model: string;
  requests: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  estimatedCost: number;
  lastReset: number;
  requestsThisMinute: number;
  minuteWindowStart: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute?: number;
  requestsPerDay?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

export interface ModelPricing {
  input: number;
  output: number;
}

// Model catalog for each provider
export const MODEL_CATALOG: Record<LLMProvider, ModelInfo[]> = {
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Balanced (recommended)', isDefault: true },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Fast & cheap' },
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable', isDefault: true },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced (recommended)', isDefault: true },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Free preview', isDefault: true },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning' },
  ],
};

// Tier-aware rate limits
export const RATE_LIMITS_BY_TIER = {
  groq: {
    free: { requestsPerMinute: 30, requestsPerDay: 14400 },
    paid: { requestsPerMinute: 300, requestsPerDay: 144000 },
  },
  openai: {
    tier1: { requestsPerMinute: 500, tokensPerMinute: 30000 },
    tier2: { requestsPerMinute: 5000, tokensPerMinute: 450000 },
    tier3: { requestsPerMinute: 5000, tokensPerMinute: 2000000 },
    tier4: { requestsPerMinute: 10000, tokensPerMinute: 4000000 },
    tier5: { requestsPerMinute: 10000, tokensPerMinute: 20000000 },
  },
  anthropic: {
    tier1: { requestsPerMinute: 50, tokensPerMinute: 40000 },
    tier2: { requestsPerMinute: 1000, tokensPerMinute: 80000 },
    tier3: { requestsPerMinute: 2000, tokensPerMinute: 160000 },
    tier4: { requestsPerMinute: 4000, tokensPerMinute: 400000 },
  },
  gemini: {
    free: { requestsPerMinute: 15 },
    paid: { requestsPerMinute: 1500 },
  },
};

// Model-specific pricing per 1M tokens (USD)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Groq
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
  // Gemini
  'gemini-2.0-flash-exp': { input: 0.00, output: 0.00 }, // Free during preview
  'gemini-2.5-pro': { input: 1.25, output: 5.00 },
};

// Helper to get rate limit for provider/tier
export function getRateLimitForTier(
  provider: LLMProvider,
  tier: GroqTier | OpenAITier | AnthropicTier | GeminiTier
): RateLimitConfig {
  const limits = RATE_LIMITS_BY_TIER[provider];
  return limits[tier as keyof typeof limits] || limits[Object.keys(limits)[0] as any];
}

// Helper to get pricing for model
export function getPricingForModel(modelId: string): ModelPricing {
  return MODEL_PRICING[modelId] || { input: 0, output: 0 };
}

// Helper to get default model for provider
export function getDefaultModel(provider: LLMProvider): string {
  const models = MODEL_CATALOG[provider];
  const defaultModel = models.find(m => m.isDefault);
  return defaultModel?.id || models[0].id;
}
