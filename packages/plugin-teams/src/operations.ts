import type { TeamsCard } from './types.js';

export interface TeamsOperations {
  sendWebhook(url: string, card: TeamsCard): Promise<void>;
}

export const defaultTeamsOperations: TeamsOperations = {
  async sendWebhook(url: string, card: TeamsCard): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    if (!response.ok) {
      throw new Error(`Teams webhook failed: ${response.status} ${response.statusText}`);
    }
  },
};
