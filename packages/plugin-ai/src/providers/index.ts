export interface AiProvider {
  generateText(prompt: string, maxTokens: number): Promise<string>;
}

export type ProviderName = 'openai' | 'anthropic' | 'gemini';

export interface ProviderConfig {
  provider: ProviderName;
  model?: string;
  apiKey?: string;
  maxTokens?: number;
}
