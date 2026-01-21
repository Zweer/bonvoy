import type { BonvoyPlugin, ReleaseContext } from '@bonvoy/core';
import { Octokit } from '@octokit/rest';

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

  constructor(options: GitHubPluginOptions = {}) {
    this.options = options;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Bonvoy type causes circular dependency
  apply(bonvoy: any): void {
    bonvoy.hooks.makeRelease.tapPromise(this.name, async (context: ReleaseContext) => {
      if (context.isDryRun) {
        console.log('🔍 [dry-run] Would create GitHub releases');
        return;
      }

      const token = this.options.token || process.env.GITHUB_TOKEN;
      if (!token) {
        console.warn('⚠️  GITHUB_TOKEN not found, skipping GitHub releases');
        return;
      }

      const octokit = new Octokit({ auth: token });

      // Get repo info from git remote or options
      const { owner, repo } = await this.getRepoInfo(context.rootPath);

      for (const pkg of context.changedPackages) {
        const version = context.versions[pkg.name];
        const changelog = context.changelogs[pkg.name] || '';
        const tagName = `${pkg.name}@${version}`;

        try {
          await octokit.repos.createRelease({
            owner,
            repo,
            tag_name: tagName,
            name: `${pkg.name} v${version}`,
            body: changelog,
            draft: this.options.draft || false,
            prerelease: this.options.prerelease || version.includes('-'),
          });

          console.log(`✅ Created GitHub release: ${tagName}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to create release for ${tagName}:`, errorMessage);
          throw error;
        }
      }
    });
  }

  private async getRepoInfo(rootPath: string): Promise<{ owner: string; repo: string }> {
    // Use options if provided
    if (this.options.owner && this.options.repo) {
      return { owner: this.options.owner, repo: this.options.repo };
    }

    // Parse from git remote
    const { execa } = await import('execa');
    try {
      const { stdout } = await execa('git', ['remote', 'get-url', 'origin'], { cwd: rootPath });
      const match = stdout.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    } catch {
      // Ignore error
    }

    throw new Error(
      'Could not determine GitHub repository. Please provide owner and repo in plugin options.',
    );
  }
}
