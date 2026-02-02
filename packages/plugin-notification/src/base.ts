import type { BonvoyPlugin, ReleaseContext } from '@bonvoy/core';

import { formatMessage } from './formatter.js';
import type { NotificationConfig, NotificationMessage } from './types.js';

export abstract class NotificationPlugin implements BonvoyPlugin {
  abstract name: string;
  protected config: Required<NotificationConfig>;

  constructor(config: NotificationConfig = {}) {
    this.config = {
      onSuccess: config.onSuccess ?? true,
      onFailure: config.onFailure ?? false,
      includeChangelog: config.includeChangelog ?? true,
      includePackages: config.includePackages ?? true,
      includeLinks: config.includeLinks ?? true,
      maxChangelogLength: config.maxChangelogLength ?? 500,
      titleTemplate: config.titleTemplate ?? '🚀 Released {count} package(s)',
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Bonvoy type causes circular dependency
  apply(bonvoy: any): void {
    bonvoy.hooks.afterRelease.tapPromise(this.name, async (context: ReleaseContext) => {
      if (context.isDryRun) {
        context.logger.info(`🔍 [dry-run] Would send ${this.name} notification`);
        return;
      }

      if (!this.config.onSuccess) return;

      const message = formatMessage(context, this.config);
      await this.send(message, context);
      context.logger.info(`📨 ${this.name} notification sent`);
    });
  }

  protected abstract send(message: NotificationMessage, context: ReleaseContext): Promise<void>;
}
