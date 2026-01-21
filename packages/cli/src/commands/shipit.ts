import type { ChangelogContext, Context, Package, ReleaseContext } from '@bonvoy/core';
import { assignCommitsToPackages, Bonvoy, loadConfig } from '@bonvoy/core';
import ChangelogPlugin from '@bonvoy/plugin-changelog';
import ConventionalPlugin from '@bonvoy/plugin-conventional';
import GitPlugin from '@bonvoy/plugin-git';
import GitHubPlugin from '@bonvoy/plugin-github';
import NpmPlugin from '@bonvoy/plugin-npm';
import { inc, valid } from 'semver';

import { detectPackages } from '../utils/detect-packages.js';
import { getCommitsSinceLastTag } from '../utils/git.js';
import type { ShipitOptions, ShipitResult } from '../utils/types.js';

export async function shipit(_bump?: string, options: ShipitOptions = {}): Promise<ShipitResult> {
  const rootPath = options.cwd || process.cwd();

  // 1. Load configuration
  const config = await loadConfig(rootPath);

  // 2. Initialize Bonvoy with hooks
  const bonvoy = new Bonvoy(config);

  // 3. Load default plugins
  bonvoy.use(new ConventionalPlugin(config.conventional));
  bonvoy.use(new ChangelogPlugin(config.changelog));
  bonvoy.use(new GitPlugin(config.git));
  bonvoy.use(new NpmPlugin(config.npm));
  bonvoy.use(new GitHubPlugin(config.github));

  // 4. Detect workspace packages
  const packages = await detectPackages(rootPath);

  // 5. Analyze commits since last release
  const commits = await getCommitsSinceLastTag(rootPath);
  const commitsWithPackages = assignCommitsToPackages(commits, packages, rootPath);

  // 6. Determine version bumps per package
  const changedPackages: Package[] = [];
  const versions: Record<string, string> = {};
  const bumps: Record<string, string> = {};

  // Parse force bump if provided
  const forceBump = _bump ? parseForceBump(_bump) : null;

  for (const pkg of packages) {
    const pkgCommits = commitsWithPackages.filter((c) => c.packages.includes(pkg.name));

    const context: Context = {
      config,
      packages,
      changedPackages: [pkg],
      rootPath,
      isDryRun: options.dryRun || false,
      commits: pkgCommits,
      currentPackage: pkg,
    };

    let bumpType: string | null = await bonvoy.hooks.getVersion.promise(context);

    // Apply force bump if provided
    if (forceBump) {
      bumpType = forceBump;
    }

    if (bumpType && bumpType !== 'none') {
      let newVersion: string;
      if (bumpType === 'major' || bumpType === 'minor' || bumpType === 'patch') {
        newVersion = inc(pkg.version, bumpType) || pkg.version;
      } else {
        // Explicit version - validate it's a valid semver
        if (!valid(bumpType)) {
          throw new Error(
            `Invalid version "${bumpType}" for package ${pkg.name}. Must be a valid semver version or bump type (major/minor/patch).`,
          );
        }
        newVersion = bumpType;
      }
      versions[pkg.name] = newVersion;
      bumps[pkg.name] = bumpType;
      changedPackages.push(pkg);
    }
  }

  // 7. Generate changelogs
  const changelogContext: ChangelogContext = {
    config,
    packages,
    changedPackages,
    rootPath,
    isDryRun: options.dryRun || false,
    commits: commitsWithPackages,
    versions,
    bumps,
    changelogs: {},
  };

  await bonvoy.hooks.beforeChangelog.promise(changelogContext);
  await bonvoy.hooks.generateChangelog.promise(changelogContext);
  await bonvoy.hooks.afterChangelog.promise(changelogContext);

  if (!options.dryRun) {
    // 8. Publish packages
    const publishContext = {
      ...changelogContext,
      publishedPackages: [],
    };

    await bonvoy.hooks.beforePublish.promise(publishContext);
    await bonvoy.hooks.publish.promise(publishContext);
    await bonvoy.hooks.afterPublish.promise(publishContext);

    // 9. Create GitHub releases
    const releaseContext: ReleaseContext = {
      ...publishContext,
      releases: {},
    };

    await bonvoy.hooks.beforeRelease.promise(releaseContext);
    await bonvoy.hooks.makeRelease.promise(releaseContext);
    await bonvoy.hooks.afterRelease.promise(releaseContext);
  }

  return {
    packages,
    changedPackages,
    versions,
    bumps,
    changelogs: changelogContext.changelogs,
    commits: commitsWithPackages,
  };
}

function parseForceBump(bump: string): string {
  return bump;
}

export async function shipitCommand(
  bump?: string,
  options: { dryRun?: boolean; package?: string[] } = {},
): Promise<void> {
  try {
    console.log('🚢 Starting bonvoy release...');
    if (options.dryRun) console.log('🔍 Dry run mode enabled');

    const result = await shipit(bump, options);

    console.log('✅ Configuration loaded');
    console.log('✅ Plugins loaded');
    console.log(`✅ Detected ${result.packages.length} package(s)`);
    console.log(`✅ Analyzed ${result.commits.length} commit(s)`);

    for (const pkg of result.changedPackages) {
      const oldVersion = result.packages.find((p) => p.name === pkg.name)?.version;
      const newVersion = result.versions[pkg.name];
      const bump = result.bumps[pkg.name];
      console.log(`  ${pkg.name}: ${oldVersion} → ${newVersion} (${bump})`);
    }

    if (result.changedPackages.length === 0) {
      console.log('✅ No changes detected - nothing to release');
      return;
    }

    console.log(`✅ ${result.changedPackages.length} package(s) to release`);
    console.log('✅ Changelogs generated');

    if (options.dryRun) {
      console.log('🔍 Dry run completed - no changes made');
      return;
    }

    console.log('🎉 Release completed successfully!');
  } catch (error) {
    console.error('❌ Release failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
