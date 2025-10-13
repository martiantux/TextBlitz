// Anthropic Claude LLM provider

import { LLMProvider } from './providers';
import { LLMRequest, LLMResponse } from './types';

export class AnthropicProvider extends LLMProvider {
  private readonly baseURL = 'https://api.anthropic.com/v1';
  private readonly model = 'claude-sonnet-4-20250514';
  private readonly apiVersion = '2023-06-01';

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const timeout = this.config.timeout || 5000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.apiVersion,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || this.model,
          max_tokens: request.maxTokens || 100,
          messages: [
            {
              role: 'user',
              content: `You are a text completion assistant. Generate brief, natural variations of common phrases. Keep responses under 50 words unless specified. Do not ask questions or include placeholders. Output only the requested text, no explanations.\n\n${request.prompt}`
            }
          ],
          temperature: request.temperature || 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      if (!data.content || data.content.length === 0) {
        throw new Error('No response from Anthropic');
      }

      const text = data.content[0].text.trim();
      const usage = data.usage || { input_tokens: 0, output_tokens: 0 };

      return {
        text,
        tokensUsed: {
          input: usage.input_tokens,
          output: usage.output_tokens,
          total: usage.input_tokens + usage.output_tokens,
        },
        model: data.model || this.model,
        provider: 'anthropic',
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Anthropic request timed out');
      }

      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.complete({
        prompt: 'Say "test" and nothing else',
        maxTokens: 10,
      });
      return true;
    } catch {
      return false;
    }
  }

  getModelName(): string {
    return this.config.model || this.model;
  }
}
