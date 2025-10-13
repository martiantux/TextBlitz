// LLM Manager - coordinates providers and usage tracking

import { LLMProvider as LLMProviderType, LLMRequest, LLMResponse } from './types';
import { GroqProvider } from './groq';
import { AnthropicProvider } from './anthropic';
import { UsageTracker } from './usage-tracker';
import { LLMProvider } from './providers';

export class LLMManager {
  private providers: Map<LLMProviderType, LLMProvider> = new Map();
  private usageTracker: UsageTracker;

  constructor() {
    this.usageTracker = new UsageTracker();
  }

  // Initialize a provider with API key
  setProvider(providerType: LLMProviderType, apiKey: string, timeout?: number) {
    let provider: LLMProvider;

    switch (providerType) {
      case 'groq':
        provider = new GroqProvider({ apiKey, timeout });
        break;
      case 'anthropic':
        provider = new AnthropicProvider({ apiKey, timeout });
        break;
      default:
        throw new Error(`Unknown provider: ${providerType}`);
    }

    this.providers.set(providerType, provider);
  }

  // Complete a request with a specific provider
  async complete(providerType: LLMProviderType, request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} not initialized. Please add an API key in settings.`);
    }

    // Check rate limits
    if (!this.usageTracker.canMakeRequest(providerType)) {
      throw new Error(`Rate limit exceeded for ${providerType}. Please wait a minute.`);
    }

    // Warn if approaching limit
    if (this.usageTracker.isApproachingLimit(providerType)) {
      console.warn(`TextBlitz: Approaching rate limit for ${providerType}`);
    }

    // Make the request
    const response = await provider.complete(request);

    // Track usage
    await this.usageTracker.trackRequest(response);

    return response;
  }

  // Test connection for a provider
  async testConnection(providerType: LLMProviderType): Promise<boolean> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      return false;
    }

    return provider.testConnection();
  }

  // Get usage stats
  getUsageTracker(): UsageTracker {
    return this.usageTracker;
  }
}

// Singleton instance
export const llmManager = new LLMManager();
