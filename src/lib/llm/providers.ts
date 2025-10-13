// Abstract LLM provider interface

import { LLMRequest, LLMResponse, LLMProviderConfig } from './types';

export abstract class LLMProvider {
  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract complete(request: LLMRequest): Promise<LLMResponse>;
  abstract testConnection(): Promise<boolean>;
  abstract getModelName(): string;
}
