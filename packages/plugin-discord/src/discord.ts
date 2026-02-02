import type { NotificationMessage } from '@bonvoy/plugin-notification';
import { NotificationPlugin } from '@bonvoy/plugin-notification';

import { type DiscordOperations, defaultDiscordOperations } from './operations.js';
import { buildDiscordPayload, type DiscordConfig } from './types.js';

export default class DiscordPlugin extends NotificationPlugin {
  name = 'discord';
  private discordConfig: DiscordConfig;
  private ops: DiscordOperations;

  constructor(config: DiscordConfig, ops?: DiscordOperations) {
    super(config);
    this.discordConfig = config;
    this.ops = ops ?? defaultDiscordOperations;

    if (!config.webhookUrl) {
      throw new Error('DiscordPlugin requires webhookUrl');
    }
  }

  protected async send(message: NotificationMessage): Promise<void> {
    const payload = buildDiscordPayload(message, this.discordConfig);
    await this.ops.sendWebhook(this.discordConfig.webhookUrl, payload);
  }
}

export { type DiscordOperations, defaultDiscordOperations } from './operations.js';
export {
  buildDiscordPayload,
  type DiscordConfig,
  type DiscordEmbed,
  type DiscordPayload,
} from './types.js';
