import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { BonvoyPlugin, PRContext, ReleaseContext } from '@bonvoy/core';

import { defaultGitHubOperations, type GitHubOperations } from './operations.js';

export interface GitHubPluginOptions {
  token?: string;
  owner?: string;
  repo?: string;
  draft?: boolean;
  prerelease?: boolean;
}

export default class GitHubPlugin implements BonvoyPlugin {
  name = 'github';
  private options: GitHubPluginOptions;
  private ops: GitHubOperations;

  constructor(options: GitHubPluginOptions = {}, ops?: GitHubOperations) {
    this.options = options;
    this.ops = ops ?? defaultGitHubOperations;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Bonvoy type causes circular dependency
  apply(bonvoy: any): void {
    bonvoy.hooks.makeRelease.tapPromise(this.name, async (context: ReleaseContext) => {
      if (context.isDryRun) {
        context.logger.info('🔍 [dry-run] Would create GitHub releases');
        return;
      }

      const token = this.options.token || process.env.GITHUB_TOKEN;
      if (!token) {
        context.logger.warn('⚠️  GITHUB_TOKEN not found, skipping GitHub releases');
        return;
      }

      const { owner, repo } = this.getRepoInfo(context.rootPath);

      for (const pkg of context.changedPackages) {
        const version = context.versions[pkg.name];
        const changelog = context.changelogs[pkg.name] || '';
        const tagName = `${pkg.name}@${version}`;

        try {
          await this.ops.createRelease(token, {
            owner,
            repo,
            tag_name: tagName,
            name: `${pkg.name} v${version}`,
            body: changelog,
            draft: this.options.draft || false,
            prerelease: this.options.prerelease || version.includes('-'),
          });

          context.logger.info(`✅ Created GitHub release: ${tagName}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.logger.error(`❌ Failed to create release for ${tagName}: ${errorMessage}`);
          throw error;
        }
      }
    });

    // PR creation hook
    bonvoy.hooks.createPR.tapPromise(this.name, async (context: PRContext) => {
      if (context.isDryRun) {
        context.logger.info('🔍 [dry-run] Would create GitHub PR');
        return;
      }

      const token = this.options.token || process.env.GITHUB_TOKEN;
      if (!token) {
        context.logger.warn('⚠️  GITHUB_TOKEN not found, skipping PR creation');
        return;
      }

      const { owner, repo } = this.getRepoInfo(context.rootPath);

      try {
        const result = await this.ops.createPR(token, {
          owner,
          repo,
          title: context.title,
          body: context.body,
          head: context.branchName,
          base: context.baseBranch,
        });

        context.prUrl = result.url;
        context.prNumber = result.number;
        context.logger.info(`✅ Created GitHub PR: ${result.url}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.error(`❌ Failed to create PR: ${errorMessage}`);
        throw error;
      }
    });
  }

  private getRepoInfo(rootPath: string): { owner: string; repo: string } {
    // Use options if provided
    if (this.options.owner && this.options.repo) {
      return { owner: this.options.owner, repo: this.options.repo };
    }

    // Read from package.json repository field
    try {
      const pkgPath = join(rootPath, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;

      if (repoUrl) {
        const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
        if (match) {
          return { owner: match[1], repo: match[2] };
        }
      }
    } catch {
      // Ignore error
    }

    throw new Error(
      'Could not determine GitHub repository. Please set "repository" in package.json or provide owner/repo in plugin options.',
    );
  }
}

export {
  defaultGitHubOperations,
  type GitHubOperations,
  type GitHubPRParams,
  type GitHubPRResult,
  type GitHubReleaseParams,
} from './operations.js';
