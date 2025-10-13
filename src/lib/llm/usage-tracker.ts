// LLM usage tracking and rate limiting

import { LLMProvider, LLMResponse, UsageStats, getRateLimitForTier, getPricingForModel } from './types';
import { StorageManager } from '../storage';

export class UsageTracker {
  private stats: Map<LLMProvider, UsageStats> = new Map();

  constructor() {
    this.loadStats();
  }

  private async loadStats() {
    try {
      const result = await chrome.storage.local.get('llmUsage');
      if (result.llmUsage) {
        // Load all 4 providers
        for (const provider of ['groq', 'anthropic', 'openai', 'gemini'] as LLMProvider[]) {
          const providerStats = result.llmUsage[provider];
          if (providerStats) {
            this.stats.set(provider, providerStats);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load LLM usage stats:', error);
    }
  }

  private async saveStats() {
    try {
      const llmUsage: any = {};

      // Save all 4 providers
      for (const provider of ['groq', 'anthropic', 'openai', 'gemini'] as LLMProvider[]) {
        if (this.stats.has(provider)) {
          llmUsage[provider] = this.stats.get(provider);
        }
      }

      await chrome.storage.local.set({ llmUsage });
    } catch (error) {
      console.error('Failed to save LLM usage stats:', error);
    }
  }

  private async getOrCreateStats(provider: LLMProvider): Promise<UsageStats> {
    if (!this.stats.has(provider)) {
      // Get the configured model for this provider
      const settings = await StorageManager.getSettings();
      const model = settings.llmModels[provider] || '';

      this.stats.set(provider, {
        provider,
        model,
        requests: 0,
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        estimatedCost: 0,
        lastReset: Date.now(),
        requestsThisMinute: 0,
        minuteWindowStart: Date.now(),
      });
    }
    return this.stats.get(provider)!;
  }

  // Check if request would exceed rate limit (tier-aware)
  async canMakeRequest(provider: LLMProvider): Promise<boolean> {
    const stats = await this.getOrCreateStats(provider);
    const settings = await StorageManager.getSettings();
    const now = Date.now();

    // Reset minute window if needed
    if (now - stats.minuteWindowStart > 60000) {
      stats.requestsThisMinute = 0;
      stats.minuteWindowStart = now;
    }

    // Get tier-aware limit or custom override
    let limit: number;
    if (settings.llmCustomLimits?.[provider]?.requestsPerMinute) {
      limit = settings.llmCustomLimits[provider].requestsPerMinute!;
    } else {
      const tier = settings.llmTiers[provider] || this.getDefaultTier(provider);
      const rateLimitConfig = getRateLimitForTier(provider, tier as any);
      limit = rateLimitConfig.requestsPerMinute;
    }

    return stats.requestsThisMinute < limit;
  }

  // Track a completed request with model-specific pricing
  async trackRequest(response: LLMResponse) {
    const stats = await this.getOrCreateStats(response.provider);
    const now = Date.now();

    // Reset minute window if needed
    if (now - stats.minuteWindowStart > 60000) {
      stats.requestsThisMinute = 0;
      stats.minuteWindowStart = now;
    }

    // Update counters
    stats.requests++;
    stats.requestsThisMinute++;
    stats.tokensInput += response.tokensUsed.input;
    stats.tokensOutput += response.tokensUsed.output;
    stats.tokensTotal += response.tokensUsed.total;

    // Update model if it changed
    stats.model = response.model;

    // Calculate cost using model-specific pricing
    const pricing = getPricingForModel(response.model);
    const inputCost = (response.tokensUsed.input / 1_000_000) * pricing.input;
    const outputCost = (response.tokensUsed.output / 1_000_000) * pricing.output;
    stats.estimatedCost += inputCost + outputCost;

    await this.saveStats();
  }

  // Get stats for a provider
  async getStats(provider: LLMProvider): Promise<UsageStats> {
    return await this.getOrCreateStats(provider);
  }

  // Get all stats
  async getAllStats(): Promise<Record<LLMProvider, UsageStats>> {
    return {
      groq: await this.getOrCreateStats('groq'),
      anthropic: await this.getOrCreateStats('anthropic'),
      openai: await this.getOrCreateStats('openai'),
      gemini: await this.getOrCreateStats('gemini'),
    };
  }

  // Reset stats for a provider
  async resetStats(provider: LLMProvider) {
    const stats = await this.getOrCreateStats(provider);
    const settings = await StorageManager.getSettings();
    const model = settings.llmModels[provider] || '';

    stats.model = model;
    stats.requests = 0;
    stats.tokensInput = 0;
    stats.tokensOutput = 0;
    stats.tokensTotal = 0;
    stats.estimatedCost = 0;
    stats.lastReset = Date.now();
    stats.requestsThisMinute = 0;
    stats.minuteWindowStart = Date.now();
    await this.saveStats();
  }

  // Reset all stats
  async resetAllStats() {
    for (const provider of ['groq', 'anthropic', 'openai', 'gemini'] as LLMProvider[]) {
      await this.resetStats(provider);
    }
  }

  // Check if approaching rate limit (configurable threshold)
  async isApproachingLimit(provider: LLMProvider, threshold: number = 80): Promise<boolean> {
    const stats = await this.getOrCreateStats(provider);
    const settings = await StorageManager.getSettings();

    // Get tier-aware limit or custom override
    let limit: number;
    if (settings.llmCustomLimits?.[provider]?.requestsPerMinute) {
      limit = settings.llmCustomLimits[provider].requestsPerMinute!;
    } else {
      const tier = settings.llmTiers[provider] || this.getDefaultTier(provider);
      const rateLimitConfig = getRateLimitForTier(provider, tier as any);
      limit = rateLimitConfig.requestsPerMinute;
    }

    return stats.requestsThisMinute >= limit * (threshold / 100);
  }

  // Get current rate limit for provider
  async getRateLimit(provider: LLMProvider): Promise<{ requestsPerMinute: number; tokensPerMinute?: number }> {
    const settings = await StorageManager.getSettings();

    if (settings.llmCustomLimits?.[provider]) {
      return settings.llmCustomLimits[provider];
    }

    const tier = settings.llmTiers[provider] || this.getDefaultTier(provider);
    return getRateLimitForTier(provider, tier as any);
  }

  private getDefaultTier(provider: LLMProvider): string {
    const defaults: Record<LLMProvider, string> = {
      groq: 'free',
      openai: 'tier1',
      anthropic: 'tier1',
      gemini: 'free',
    };
    return defaults[provider];
  }
}
