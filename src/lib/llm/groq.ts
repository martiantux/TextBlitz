// Groq Cloud LLM provider

import { LLMProvider } from './providers';
import { LLMRequest, LLMResponse } from './types';

export class GroqProvider extends LLMProvider {
  private readonly baseURL = 'https://api.groq.com/openai/v1';
  private readonly model = 'llama-3.1-8b-instant';

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const timeout = this.config.timeout || 5000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const systemPrompt = this.config.systemPrompt ||
        'You are a text completion assistant. Output clean, paste-ready text with no quotes, markdown formatting, or explanations. Generate natural variations of the requested content. Keep responses under 50 words unless explicitly asked for more. Never ask questions back or include placeholders like [brackets]. Output only the exact text the user needs.';

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: request.prompt
            }
          ],
          max_tokens: request.maxTokens || 100,
          temperature: request.temperature || 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq');
      }

      const text = data.choices[0].message.content.trim();
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      return {
        text,
        tokensUsed: {
          input: usage.prompt_tokens,
          output: usage.completion_tokens,
          total: usage.total_tokens,
        },
        model: data.model || this.model,
        provider: 'groq',
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Groq request timed out');
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
