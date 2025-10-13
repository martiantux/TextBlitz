// LLM usage tracking and rate limiting

import { LLMProvider, LLMResponse, RATE_LIMITS, PRICING, UsageStats } from './types';

export class UsageTracker {
  private stats: Map<LLMProvider, UsageStats> = new Map();

  constructor() {
    this.loadStats();
  }

  private async loadStats() {
    try {
      const result = await chrome.storage.local.get('llmUsage');
      if (result.llmUsage) {
        // Convert stored data to Map
        const groq = result.llmUsage.groq;
        const anthropic = result.llmUsage.anthropic;

        if (groq) {
          this.stats.set('groq', groq);
        }
        if (anthropic) {
          this.stats.set('anthropic', anthropic);
        }
      }
    } catch (error) {
      console.error('Failed to load LLM usage stats:', error);
    }
  }

  private async saveStats() {
    try {
      const llmUsage: any = {};

      if (this.stats.has('groq')) {
        llmUsage.groq = this.stats.get('groq');
      }
      if (this.stats.has('anthropic')) {
        llmUsage.anthropic = this.stats.get('anthropic');
      }

      await chrome.storage.local.set({ llmUsage });
    } catch (error) {
      console.error('Failed to save LLM usage stats:', error);
    }
  }

  private getOrCreateStats(provider: LLMProvider): UsageStats {
    if (!this.stats.has(provider)) {
      this.stats.set(provider, {
        provider,
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

  // Check if request would exceed rate limit
  canMakeRequest(provider: LLMProvider): boolean {
    const stats = this.getOrCreateStats(provider);
    const now = Date.now();

    // Reset minute window if needed
    if (now - stats.minuteWindowStart > 60000) {
      stats.requestsThisMinute = 0;
      stats.minuteWindowStart = now;
    }

    const limit = RATE_LIMITS[provider].requestsPerMinute;
    return stats.requestsThisMinute < limit;
  }

  // Track a completed request
  async trackRequest(response: LLMResponse) {
    const stats = this.getOrCreateStats(response.provider);
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

    // Calculate cost (per 1M tokens)
    const pricing = PRICING[response.provider];
    const inputCost = (response.tokensUsed.input / 1_000_000) * pricing.input;
    const outputCost = (response.tokensUsed.output / 1_000_000) * pricing.output;
    stats.estimatedCost += inputCost + outputCost;

    await this.saveStats();
  }

  // Get stats for a provider
  getStats(provider: LLMProvider): UsageStats {
    return this.getOrCreateStats(provider);
  }

  // Get all stats
  getAllStats(): Record<LLMProvider, UsageStats> {
    return {
      groq: this.getOrCreateStats('groq'),
      anthropic: this.getOrCreateStats('anthropic'),
    };
  }

  // Reset stats for a provider
  async resetStats(provider: LLMProvider) {
    const stats = this.getOrCreateStats(provider);
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

  // Check if approaching rate limit (80% threshold)
  isApproachingLimit(provider: LLMProvider): boolean {
    const stats = this.getOrCreateStats(provider);
    const limit = RATE_LIMITS[provider].requestsPerMinute;
    return stats.requestsThisMinute >= limit * 0.8;
  }
}
