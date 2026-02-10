import type { AiProvider } from './index.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model ?? DEFAULT_MODEL;
  }

  async generateText(prompt: string, maxTokens: number): Promise<string> {
    const response = await fetch(`${ENDPOINT}/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      candidates: [{ content: { parts: [{ text: string }] } }];
    };
    return data.candidates[0].content.parts[0].text.trim();
  }
}
