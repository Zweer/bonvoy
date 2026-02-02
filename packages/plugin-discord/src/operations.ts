import type { DiscordPayload } from './types.js';

export interface DiscordOperations {
  sendWebhook(url: string, payload: DiscordPayload): Promise<void>;
}

export const defaultDiscordOperations: DiscordOperations = {
  async sendWebhook(url: string, payload: DiscordPayload): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }
  },
};
