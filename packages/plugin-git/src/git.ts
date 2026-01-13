import type { BonvoyPlugin, PublishContext } from '@bonvoy/core';
import { execa } from 'execa';

export interface GitPluginConfig {
  commitMessage?: string;
  tagFormat?: string;
  push?: boolean;
}

export default class GitPlugin implements BonvoyPlugin {
  name = 'git';

  private config: Required<GitPluginConfig>;

  constructor(config: GitPluginConfig = {}) {
    this.config = {
      commitMessage: config.commitMessage ?? 'chore: release {packages}',
      tagFormat: config.tagFormat ?? '{name}@{version}',
      push: config.push ?? true,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Hook types are complex and vary by implementation
  apply(bonvoy: { hooks: { beforePublish: any; afterPublish: any } }): void {
    bonvoy.hooks.beforePublish.tap(this.name, async (context: PublishContext) => {
      await this.commitChanges(context);
      await this.createTags(context);
    });

    bonvoy.hooks.afterPublish.tap(this.name, async (context: PublishContext) => {
      if (this.config.push) {
        await this.pushChanges(context);
      }
    });
  }

  private async commitChanges(context: PublishContext): Promise<void> {
    const { packages } = context;

    if (packages.length === 0) return;

    // Add all changed files
    await execa('git', ['add', '.']);

    // Create commit message
    const packageNames = packages.map((pkg) => pkg.name).join(', ');
    const message = this.config.commitMessage.replace('{packages}', packageNames);

    // Commit changes
    await execa('git', ['commit', '-m', message]);
  }

  private async createTags(context: PublishContext): Promise<void> {
    const { packages } = context;

    for (const pkg of packages) {
      const tag = this.config.tagFormat
        .replace('{name}', pkg.name)
        .replace('{version}', pkg.version);

      await execa('git', ['tag', tag]);
    }
  }

  private async pushChanges(_context: PublishContext): Promise<void> {
    // Push commits
    await execa('git', ['push']);

    // Push tags
    await execa('git', ['push', '--tags']);
  }
}
