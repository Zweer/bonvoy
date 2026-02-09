import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  BonvoyPlugin,
  Context,
  PRContext,
  ReleaseContext,
  RollbackContext,
} from '@bonvoy/core';
import { withRetry } from '@bonvoy/core';

import { defaultGitLabOperations, type GitLabOperations } from './operations.js';

export interface GitLabPluginOptions {
  token?: string;
  host?: string;
  projectId?: string | number;
  tagFormat?: string;
}

export default class GitLabPlugin implements BonvoyPlugin {
  name = 'gitlab';
  private options: GitLabPluginOptions;
  private ops: GitLabOperations;

  constructor(options: GitLabPluginOptions = {}, ops?: GitLabOperations) {
    this.options = options;
    this.ops = ops ?? defaultGitLabOperations;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Bonvoy type causes circular dependency
  apply(bonvoy: any): void {
    bonvoy.hooks.validateRepo.tapPromise(this.name, async (context: Context) => {
      await this.validateReleases(context);
    });

    bonvoy.hooks.makeRelease.tapPromise(this.name, async (context: ReleaseContext) => {
      if (context.isDryRun) {
        context.logger.info('🔍 [dry-run] Would create GitLab releases');
        return;
      }

      const token = this.options.token || process.env.GITLAB_TOKEN;
      if (!token) {
        context.logger.warn('⚠️  GITLAB_TOKEN not found, skipping GitLab releases');
        return;
      }

      const host = this.options.host || process.env.GITLAB_HOST || 'https://gitlab.com';
      const projectId = this.getProjectId(context.rootPath);

      for (const pkg of context.changedPackages) {
        const version = context.versions[pkg.name];
        const changelog = context.changelogs[pkg.name] || '';
        const tagFormat = this.options.tagFormat ?? '{name}@{version}';
        const tagName = tagFormat.replace('{name}', pkg.name).replace('{version}', version);

        try {
          await withRetry(
            () =>
              this.ops.createRelease(token, host, {
                projectId,
                tagName,
                name: `${pkg.name} v${version}`,
                description: changelog,
              }),
            { logger: context.logger },
          );

          context.actionLog.record({
            plugin: 'gitlab',
            action: 'release',
            data: { tag: tagName, projectId: String(projectId), host },
          });

          context.logger.info(`✅ Created GitLab release: ${tagName}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.logger.error(`❌ Failed to create release for ${tagName}: ${errorMessage}`);
          throw error;
        }
      }
    });

    // MR creation hook
    bonvoy.hooks.createPR.tapPromise(this.name, async (context: PRContext) => {
      if (context.isDryRun) {
        context.logger.info('🔍 [dry-run] Would create GitLab MR');
        return;
      }

      const token = this.options.token || process.env.GITLAB_TOKEN;
      if (!token) {
        context.logger.warn('⚠️  GITLAB_TOKEN not found, skipping MR creation');
        return;
      }

      const host = this.options.host || process.env.GITLAB_HOST || 'https://gitlab.com';
      const projectId = this.getProjectId(context.rootPath);

      try {
        const result = await withRetry(
          () =>
            this.ops.createMR(token, host, {
              projectId,
              title: context.title,
              description: context.body,
              sourceBranch: context.branchName,
              targetBranch: context.baseBranch,
            }),
          { logger: context.logger },
        );

        context.prUrl = result.url;
        context.prNumber = result.iid;
        context.logger.info(`✅ Created GitLab MR: ${result.url}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.error(`❌ Failed to create MR: ${errorMessage}`);
        throw error;
      }
    });

    bonvoy.hooks.rollback.tapPromise(this.name, async (context: RollbackContext) => {
      await this.rollback(context);
    });
  }

  private async rollback(context: RollbackContext): Promise<void> {
    const { logger } = context;
    const actions = context.actions.filter((a) => a.plugin === 'gitlab').reverse();

    const token = this.options.token || process.env.GITLAB_TOKEN;
    if (!token) {
      if (actions.length > 0) {
        logger.warn('⚠️  GITLAB_TOKEN not found, cannot rollback GitLab releases');
      }
      return;
    }

    for (const action of actions) {
      if (action.action !== 'release') continue;
      const { tag, projectId, host } = action.data as {
        tag: string;
        projectId: string;
        host: string;
      };
      try {
        logger.info(`  ↩️  Deleting GitLab release: ${tag}`);
        await this.ops.deleteRelease(token, host, projectId, tag);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn(`  ⚠️  Failed to delete GitLab release ${tag}: ${msg}`);
      }
    }
  }

  private async validateReleases(context: Context): Promise<void> {
    const { changedPackages, versions, logger } = context;
    if (!versions) return;

    const token = this.options.token || process.env.GITLAB_TOKEN;
    if (!token) return;

    const host = this.options.host || process.env.GITLAB_HOST || 'https://gitlab.com';
    let projectId: string | number;
    try {
      projectId = this.getProjectId(context.rootPath);
    } catch {
      return;
    }

    const tagFormat = this.options.tagFormat ?? '{name}@{version}';
    const existing: string[] = [];

    for (const pkg of changedPackages) {
      const version = versions[pkg.name];
      /* c8 ignore start -- defensive: version always present for changedPackages */
      if (!version) continue;
      /* c8 ignore stop */
      const tag = tagFormat.replace('{name}', pkg.name).replace('{version}', version);
      if (await this.ops.releaseExists(token, host, projectId, tag)) {
        existing.push(tag);
      }
    }

    if (existing.length > 0) {
      logger.error(`❌ GitLab releases already exist: ${existing.join(', ')}`);
      throw new Error(
        `Cannot release: GitLab releases already exist (${existing.join(', ')}). Delete them first or bump to a new version.`,
      );
    }
  }

  private getProjectId(rootPath: string): string | number {
    if (this.options.projectId) {
      return this.options.projectId;
    }

    // Try to read from package.json repository field
    try {
      const pkgPath = join(rootPath, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;

      if (repoUrl) {
        // Match gitlab.com/group/project or gitlab.com/group/subgroup/project
        const match = repoUrl.match(/gitlab\.com[:/](.+?)(?:\.git)?$/);
        if (match) {
          return encodeURIComponent(match[1]);
        }
      }
    } catch {
      // Ignore error
    }

    throw new Error(
      'Could not determine GitLab project. Please set "repository" in package.json or provide projectId in plugin options.',
    );
  }
}

export {
  defaultGitLabOperations,
  type GitLabMRParams,
  type GitLabMRResult,
  type GitLabOperations,
  type GitLabReleaseParams,
} from './operations.js';
