import type { BonvoyPlugin, ChangelogContext } from '@bonvoy/core';

import { generateTemplate } from './template.js';
import { writeChangelog } from './writer.js';

export interface ChangelogConfig {
  global?: boolean;
  sections?: Record<string, string>;
  includeCommitHash?: boolean;
}

export default class ChangelogPlugin implements BonvoyPlugin {
  name = 'changelog';
  private config: ChangelogConfig;

  constructor(config: ChangelogConfig = {}) {
    this.config = {
      global: false,
      sections: {
        breaking: '💥 Breaking Changes',
        feat: '✨ Features',
        fix: '🐛 Bug Fixes',
        perf: '⚡ Performance',
        docs: '📚 Documentation',
        style: '🎨 Styles',
        refactor: '♻️ Code Refactoring',
        test: '✅ Tests',
        build: '👷 Build System',
        ci: '🔧 Continuous Integration',
        chore: '🔨 Chores',
        revert: '⏪ Reverts',
        ...config.sections, // User sections override defaults
      },
      includeCommitHash: false,
      ...config,
    };
  }

  apply(bonvoy: {
    hooks: {
      generateChangelog: { tap: (name: string, fn: (context: ChangelogContext) => string) => void };
      afterChangelog: {
        tap: (name: string, fn: (context: ChangelogContext) => Promise<void>) => void;
      };
    };
  }): void {
    bonvoy.hooks.generateChangelog.tap(this.name, (context: ChangelogContext) => {
      return this.generateChangelog(context);
    });

    bonvoy.hooks.afterChangelog.tap(this.name, async (context: ChangelogContext) => {
      await this.writeChangelogFiles(context);
    });
  }

  private generateChangelog(context: ChangelogContext): string {
    const { commits, currentPackage } = context;

    if (!currentPackage || !commits.length) {
      return '';
    }

    // Filter commits for this package
    const packageCommits = commits.filter((commit) =>
      commit.packages.includes(currentPackage.name),
    );

    if (!packageCommits.length) {
      return '';
    }

    return generateTemplate(packageCommits, currentPackage, this.config);
  }

  private async writeChangelogFiles(context: ChangelogContext): Promise<void> {
    const { changelogs, packages, rootPath } = context;

    // Write per-package changelogs
    for (const pkg of packages) {
      const changelog = changelogs[pkg.name];
      if (changelog) {
        await writeChangelog(pkg.path, changelog, pkg.version);
      }
    }

    // Write global changelog if enabled
    if (this.config.global && Object.keys(changelogs).length > 0) {
      const globalChangelog = this.generateGlobalChangelog(context);
      await writeChangelog(rootPath, globalChangelog, 'global');
    }
  }

  private generateGlobalChangelog(context: ChangelogContext): string {
    const { changelogs, packages } = context;
    const sections: string[] = [];

    for (const pkg of packages) {
      const changelog = changelogs[pkg.name];
      if (changelog) {
        sections.push(`## ${pkg.name}\n\n${changelog}`);
      }
    }

    return sections.join('\n\n');
  }
}
