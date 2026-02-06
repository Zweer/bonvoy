import type { CommitInfo, Context, Package } from '@bonvoy/core';
import { assignCommitsToPackages, Bonvoy, loadConfig } from '@bonvoy/core';
import ConventionalPlugin from '@bonvoy/plugin-conventional';
import { defaultGitOperations, type GitOperations } from '@bonvoy/plugin-git';

import { detectPackages } from '../utils/detect-packages.js';
import { getCommitsSinceLastTag } from '../utils/git.js';

/* c8 ignore start -- noop logger functions */
const noop = (): void => {};
/* c8 ignore stop */

export interface StatusResult {
  packages: Package[];
  changedPackages: Array<{ pkg: Package; bump: string }>;
  commits: CommitInfo[];
}

export async function analyzeStatus(options: {
  cwd?: string;
  gitOps?: GitOperations;
}): Promise<StatusResult> {
  const rootPath = options.cwd || process.cwd();
  const gitOps = options.gitOps ?? defaultGitOperations;

  const config = await loadConfig(rootPath);
  const bonvoy = new Bonvoy(config);
  bonvoy.use(new ConventionalPlugin(config.conventional));

  const packages = await detectPackages(rootPath);
  const commits = await getCommitsSinceLastTag(rootPath, gitOps);
  const commitsWithPackages = assignCommitsToPackages(commits, packages, rootPath);

  const changedPackages: Array<{ pkg: Package; bump: string }> = [];

  for (const pkg of packages) {
    const pkgCommits = commitsWithPackages.filter((c) => c.packages.includes(pkg.name));
    const context: Context = {
      config,
      packages,
      changedPackages: [pkg],
      rootPath,
      isDryRun: true,
      logger: { info: noop, warn: noop, error: noop },
      commits: pkgCommits,
      currentPackage: pkg,
    };

    const bump: string | null = await bonvoy.hooks.getVersion.promise(context);
    if (bump && bump !== 'none') {
      changedPackages.push({ pkg, bump });
    }
  }

  return { packages, changedPackages, commits: commitsWithPackages };
}
