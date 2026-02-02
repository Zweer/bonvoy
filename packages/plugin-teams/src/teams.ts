import type { NotificationMessage } from '@bonvoy/plugin-notification';
import { NotificationPlugin } from '@bonvoy/plugin-notification';

import { defaultTeamsOperations, type TeamsOperations } from './operations.js';
import { buildTeamsCard, type TeamsConfig } from './types.js';

export default class TeamsPlugin extends NotificationPlugin {
  name = 'teams';
  private teamsConfig: TeamsConfig;
  private ops: TeamsOperations;

  constructor(config: TeamsConfig, ops?: TeamsOperations) {
    super(config);
    this.teamsConfig = config;
    this.ops = ops ?? defaultTeamsOperations;

    if (!config.webhookUrl) throw new Error('TeamsPlugin requires webhookUrl');
  }

  protected async send(message: NotificationMessage): Promise<void> {
    const card = buildTeamsCard(message);
    await this.ops.sendWebhook(this.teamsConfig.webhookUrl, card);
  }
}

export { defaultTeamsOperations, type TeamsOperations } from './operations.js';
export { buildTeamsCard, type TeamsCard, type TeamsConfig, type TeamsSection } from './types.js';
