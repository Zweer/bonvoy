import type { SlackPayload } from './types.js';

export interface SlackOperations {
  sendWebhook(url: string, payload: SlackPayload): Promise<void>;
  sendApi(token: string, channel: string, payload: SlackPayload): Promise<void>;
}

export const defaultSlackOperations: SlackOperations = {
  async sendWebhook(url: string, payload: SlackPayload): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
  },

  async sendApi(token: string, channel: string, payload: SlackPayload): Promise<void> {
    const { WebClient } = await import('@slack/web-api');
    const client = new WebClient(token);
    await client.chat.postMessage({
      channel,
      text: payload.text,
      blocks: payload.blocks,
      username: payload.username,
      icon_emoji: payload.icon_emoji,
    });
  },
};
