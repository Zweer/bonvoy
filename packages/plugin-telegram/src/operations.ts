import type { TelegramConfig } from './types.js';

export interface TelegramOperations {
  sendMessage(config: TelegramConfig, text: string): Promise<void>;
}

export const defaultTelegramOperations: TelegramOperations = {
  async sendMessage(config: TelegramConfig, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: config.parseMode ?? 'HTML',
        disable_web_page_preview: config.disableWebPagePreview ?? true,
      }),
    });
    if (!response.ok) {
      throw new Error(`Telegram API failed: ${response.status} ${response.statusText}`);
    }
  },
};
