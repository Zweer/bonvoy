import type { NotificationMessage } from '@bonvoy/plugin-notification';
import { NotificationPlugin } from '@bonvoy/plugin-notification';

import { defaultSlackOperations, type SlackOperations } from './operations.js';
import { buildSlackPayload, type SlackConfig } from './types.js';

export default class SlackPlugin extends NotificationPlugin {
  name = 'slack';
  private slackConfig: SlackConfig;
  private ops: SlackOperations;

  constructor(config: SlackConfig, ops?: SlackOperations) {
    super(config);
    this.slackConfig = config;
    this.ops = ops ?? defaultSlackOperations;

    if (!config.webhookUrl && !config.token) {
      throw new Error('SlackPlugin requires either webhookUrl or token');
    }
    if (config.token && !config.channel) {
      throw new Error('SlackPlugin requires channel when using token');
    }
  }

  protected async send(message: NotificationMessage): Promise<void> {
    const payload = buildSlackPayload(message, this.slackConfig);
    const { token, channel, webhookUrl } = this.slackConfig;

    // Constructor validates that either (token + channel) or webhookUrl exists
    if (token && channel) {
      await this.ops.sendApi(token, channel, payload);
      return;
    }
    await this.ops.sendWebhook(webhookUrl as string, payload);
  }
}

export { defaultSlackOperations, type SlackOperations } from './operations.js';
export {
  buildSlackPayload,
  type SlackBlock,
  type SlackConfig,
  type SlackPayload,
} from './types.js';
