import type { BonvoyPlugin, Context, PublishContext, RollbackContext } from '@bonvoy/core';

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
      commitMessage: config.commitMessage ?? 'chore: :bookmark: release',
      tagFormat: config.tagFormat ?? '{name}@{version}',
      push: config.push ?? true,
    };
    this.ops = ops ?? defaultGitOperations;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Hook types are complex and vary by implementation
  apply(bonvoy: { hooks: { validateRepo: any; beforePublish: any; rollback: any } }): void {
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

    bonvoy.hooks.rollback.tapPromise(this.name, async (context: RollbackContext) => {
      await this.rollback(context);
    });
  }

  private async commitChanges(context: PublishContext): Promise<void> {
    const { packages, isDryRun, rootPath, logger, actionLog } = context;

    if (packages.length === 0) return;

    const packageList = packages.map((pkg) => `- ${pkg.name}@${pkg.version}`).join('\n');
    const packageNames = packages.map((pkg) => pkg.name).join(', ');
    const message = this.config.commitMessage
      .replace('{packages}', packageNames)
      .replace('{details}', packageList);

    // Append package details as commit body if not already included via {details}
    const fullMessage = message.includes(packageList) ? message : `${message}\n\n${packageList}`;

    logger.info(`  Commit message: "${fullMessage}"`);

    if (!isDryRun) {
      const previousSha = await this.ops.getHeadSha(rootPath);
      await this.ops.add('.', rootPath);
      await this.ops.commit(fullMessage, rootPath);
      actionLog.record({ plugin: 'git', action: 'commit', data: { previousSha } });
    }
  }

  private async createTags(context: PublishContext): Promise<void> {
    const { packages, isDryRun, rootPath, logger, actionLog } = context;
    const tags: string[] = [];

    for (const pkg of packages) {
      const tag = this.config.tagFormat
        .replace('{name}', pkg.name)
        .replace('{version}', pkg.version);

      logger.info(`  Tag: ${tag}`);

      if (!isDryRun) {
        await this.ops.tag(tag, rootPath);
        tags.push(tag);
      }
    }

    if (tags.length > 0) {
      actionLog.record({ plugin: 'git', action: 'tag', data: { tags } });
    }
  }

  private async pushChanges(context: PublishContext): Promise<void> {
    const { packages, isDryRun, rootPath, logger, actionLog } = context;

    logger.info('  Pushing commits and tags...');

    if (!isDryRun) {
      const branch = await this.ops.getCurrentBranch(rootPath);
      await this.ops.push(rootPath);
      actionLog.record({ plugin: 'git', action: 'push', data: { branch } });

      const tags = packages.map((pkg) =>
        this.config.tagFormat.replace('{name}', pkg.name).replace('{version}', pkg.version),
      );
      await this.ops.pushTags(tags, rootPath);
      actionLog.record({ plugin: 'git', action: 'pushTags', data: { tags } });
    }
  }

  private async rollback(context: RollbackContext): Promise<void> {
    const { rootPath, logger } = context;
    const actions = context.actions.filter((a) => a.plugin === 'git').reverse();

    for (const action of actions) {
      try {
        if (action.action === 'pushTags') {
          const tags = action.data.tags as string[];
          logger.info(`  ↩️  Deleting remote tags: ${tags.join(', ')}`);
          await this.ops.deleteRemoteTags(tags, rootPath);
        } else if (action.action === 'push') {
          const branch = action.data.branch as string;
          logger.info(`  ↩️  Force-pushing ${branch} to previous state`);
          await this.ops.forcePush(rootPath, branch);
        } else if (action.action === 'tag') {
          const tags = action.data.tags as string[];
          for (const tag of tags) {
            logger.info(`  ↩️  Deleting local tag: ${tag}`);
            await this.ops.deleteTag(tag, rootPath);
          }
        } else if (action.action === 'commit') {
          const sha = action.data.previousSha as string;
          logger.info(`  ↩️  Resetting to ${sha}`);
          await this.ops.resetHard(sha, rootPath);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(`  ⚠️  Failed to rollback git ${action.action}: ${msg}`);
      }
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
