import type { BonvoyPlugin, Context, PublishContext } from '@bonvoy/core';

import { defaultGitOperations, type GitOperations } from './operations.js';

export interface GitPluginConfig {
  commitMessage?: string;
  tagFormat?: string;
  push?: boolean;
}

export default class GitPlugin implements BonvoyPlugin {
  name = 'git';

  private config: Required<GitPluginConfig>;
  private ops: GitOperations;

  constructor(config: GitPluginConfig = {}, ops?: GitOperations) {
    this.config = {
      commitMessage: config.commitMessage ?? 'chore(release): :bookmark: {packages} [skip ci]',
      tagFormat: config.tagFormat ?? '{name}@{version}',
      push: config.push ?? true,
    };
    this.ops = ops ?? defaultGitOperations;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Hook types are complex and vary by implementation
  apply(bonvoy: { hooks: { validateRepo: any; beforePublish: any } }): void {
    bonvoy.hooks.validateRepo.tapPromise(this.name, async (context: Context) => {
      await this.validateTags(context);
    });

    bonvoy.hooks.beforePublish.tapPromise(this.name, async (context: PublishContext) => {
      context.logger.info('📝 Committing changes...');
      await this.commitChanges(context);
      context.logger.info('🏷️  Creating git tags...');
      await this.createTags(context);

      if (this.config.push) {
        context.logger.info('⬆️  Pushing to remote...');
        await this.pushChanges(context);
      }
    });
  }

  private async commitChanges(context: PublishContext): Promise<void> {
    const { packages, isDryRun, rootPath, logger } = context;

    if (packages.length === 0) return;

    const packageNames = packages.map((pkg) => pkg.name).join(', ');
    const message = this.config.commitMessage.replace('{packages}', packageNames);

    logger.info(`  Commit message: "${message}"`);

    if (!isDryRun) {
      await this.ops.add('.', rootPath);
      await this.ops.commit(message, rootPath);
    }
  }

  private async createTags(context: PublishContext): Promise<void> {
    const { packages, isDryRun, rootPath, logger } = context;

    for (const pkg of packages) {
      const tag = this.config.tagFormat
        .replace('{name}', pkg.name)
        .replace('{version}', pkg.version);

      logger.info(`  Tag: ${tag}`);

      if (!isDryRun) {
        await this.ops.tag(tag, rootPath);
      }
    }
  }

  private async pushChanges(context: PublishContext): Promise<void> {
    const { packages, isDryRun, rootPath, logger } = context;

    logger.info('  Pushing commits and tags...');

    if (!isDryRun) {
      await this.ops.push(rootPath);

      const tags = packages.map((pkg) =>
        this.config.tagFormat.replace('{name}', pkg.name).replace('{version}', pkg.version),
      );
      await this.ops.pushTags(tags, rootPath);
    }
  }

  private async validateTags(context: Context): Promise<void> {
    const { changedPackages, versions, rootPath, logger } = context;
    if (!versions) return;

    const existingTags: string[] = [];

    for (const pkg of changedPackages) {
      const version = versions[pkg.name];
      if (!version) continue;

      const tag = this.config.tagFormat.replace('{name}', pkg.name).replace('{version}', version);

      if (await this.ops.tagExists(tag, rootPath)) {
        existingTags.push(tag);
      }
    }

    if (existingTags.length > 0) {
      logger.error(`❌ Git tags already exist: ${existingTags.join(', ')}`);
      throw new Error(
        `Cannot release: git tags already exist (${existingTags.join(', ')}). Delete them first or bump to a new version.`,
      );
    }
  }
}

export { defaultGitOperations, type GitOperations } from './operations.js';
