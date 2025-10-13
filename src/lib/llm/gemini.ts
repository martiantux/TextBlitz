// Google Gemini LLM provider

import { LLMProvider } from './providers';
import { LLMRequest, LLMResponse } from './types';

export class GeminiProvider extends LLMProvider {
  private readonly baseURL = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly model = 'gemini-1.5-flash'; // Fast, cheap, good quality

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const timeout = this.config.timeout || 5000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const systemPrompt = this.config.systemPrompt ||
        'You are a text completion assistant. Generate brief, natural variations of common phrases. Keep responses under 50 words unless specified. Do not ask questions or include placeholders. Output only the requested text, no explanations.';

      const modelName = this.config.model || this.model;
      const response = await fetch(
        `${this.baseURL}/models/${modelName}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\n${request.prompt}`
              }]
            }],
            generationConfig: {
              maxOutputTokens: request.maxTokens || 100,
              temperature: request.temperature || 0.7,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini');
      }

      const candidate = data.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Invalid response structure from Gemini');
      }

      const text = candidate.content.parts[0].text.trim();

      // Gemini usage metadata is in a different format
      const usage = data.usageMetadata || {};
      const inputTokens = usage.promptTokenCount || 0;
      const outputTokens = usage.candidatesTokenCount || 0;

      return {
        text,
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        model: modelName,
        provider: 'gemini',
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Gemini request timed out');
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
