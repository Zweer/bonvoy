import type { NotificationMessage } from '@bonvoy/plugin-notification';
import { NotificationPlugin } from '@bonvoy/plugin-notification';

import { defaultTelegramOperations, type TelegramOperations } from './operations.js';
import { buildTelegramMessage, type TelegramConfig } from './types.js';

export default class TelegramPlugin extends NotificationPlugin {
  name = 'telegram';
  private telegramConfig: TelegramConfig;
  private ops: TelegramOperations;

  constructor(config: TelegramConfig, ops?: TelegramOperations) {
    super(config);
    this.telegramConfig = config;
    this.ops = ops ?? defaultTelegramOperations;

    if (!config.botToken) throw new Error('TelegramPlugin requires botToken');
    if (!config.chatId) throw new Error('TelegramPlugin requires chatId');
  }

  protected async send(message: NotificationMessage): Promise<void> {
    const text = buildTelegramMessage(message);
    await this.ops.sendMessage(this.telegramConfig, text);
  }
}

export { defaultTelegramOperations, type TelegramOperations } from './operations.js';
export { buildTelegramMessage, type TelegramConfig } from './types.js';
