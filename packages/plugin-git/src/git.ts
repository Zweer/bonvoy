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
      console.log('📝 Committing changes...');
      await this.commitChanges(context);
      console.log('🏷️  Creating git tags...');
      await this.createTags(context);
    });

    bonvoy.hooks.afterPublish.tap(this.name, async (context: PublishContext) => {
      if (this.config.push) {
        console.log('⬆️  Pushing to remote...');
        await this.pushChanges(context);
      }
    });
  }

  private async commitChanges(context: PublishContext): Promise<void> {
    const { packages, isDryRun } = context;

    if (packages.length === 0) return;

    // Add all changed files
    if (!isDryRun) {
      await execa('git', ['add', '.']);
    }

    // Create commit message
    const packageNames = packages.map((pkg) => pkg.name).join(', ');
    const message = this.config.commitMessage.replace('{packages}', packageNames);

    console.log(`  Commit message: "${message}"`);

    // Commit changes
    if (!isDryRun) {
      await execa('git', ['commit', '-m', message]);
    }
  }

  private async createTags(context: PublishContext): Promise<void> {
    const { packages, isDryRun } = context;

    for (const pkg of packages) {
      const tag = this.config.tagFormat
        .replace('{name}', pkg.name)
        .replace('{version}', pkg.version);

      console.log(`  Tag: ${tag}`);

      if (!isDryRun) {
        await execa('git', ['tag', tag]);
      }
    }
  }

  private async pushChanges(context: PublishContext): Promise<void> {
    const { isDryRun } = context;

    console.log('  Pushing commits and tags...');

    if (!isDryRun) {
      // Push commits
      await execa('git', ['push']);

      // Push tags
      await execa('git', ['push', '--tags']);
    }
  }
}
