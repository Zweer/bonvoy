import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { BonvoyPlugin, PRContext, ReleaseContext } from '@bonvoy/core';

import { defaultGitLabOperations, type GitLabOperations } from './operations.js';

export interface GitLabPluginOptions {
  token?: string;
  host?: string;
  projectId?: string | number;
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
        const tagName = `${pkg.name}@${version}`;

        try {
          await this.ops.createRelease(token, host, {
            projectId,
            tagName,
            name: `${pkg.name} v${version}`,
            description: changelog,
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
        const result = await this.ops.createMR(token, host, {
          projectId,
          title: context.title,
          description: context.body,
          sourceBranch: context.branchName,
          targetBranch: context.baseBranch,
        });

        context.prUrl = result.url;
        context.prNumber = result.iid;
        context.logger.info(`✅ Created GitLab MR: ${result.url}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.error(`❌ Failed to create MR: ${errorMessage}`);
        throw error;
      }
    });
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
