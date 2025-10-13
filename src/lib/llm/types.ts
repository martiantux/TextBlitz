// LLM provider types and interfaces

export type LLMProvider = 'groq' | 'anthropic';

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
}

export interface UsageStats {
  provider: LLMProvider;
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
}

export const RATE_LIMITS: Record<LLMProvider, RateLimitConfig> = {
  groq: {
    requestsPerMinute: 25, // Buffer below 30 free tier limit
  },
  anthropic: {
    requestsPerMinute: 50, // Conservative default
  },
};

// Pricing per 1M tokens (USD)
export const PRICING: Record<LLMProvider, { input: number; output: number }> = {
  groq: {
    input: 0.05,
    output: 0.08,
  },
  anthropic: {
    input: 3.0,
    output: 15.0,
  },
};
