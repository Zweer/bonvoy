import type { AiProvider } from './index.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export class AnthropicProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model ?? DEFAULT_MODEL;
  }

  async generateText(prompt: string, maxTokens: number): Promise<string> {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { content: [{ text: string }] };
    return data.content[0].text.trim();
  }
}
