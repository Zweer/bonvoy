import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ChangelogContext, Context, Package, ReleaseContext } from '@bonvoy/core';
import { assignCommitsToPackages, Bonvoy, loadConfig } from '@bonvoy/core';
import ChangelogPlugin from '@bonvoy/plugin-changelog';
import ConventionalPlugin from '@bonvoy/plugin-conventional';
import GitPlugin, { defaultGitOperations } from '@bonvoy/plugin-git';
import GitHubPlugin from '@bonvoy/plugin-github';
import NpmPlugin from '@bonvoy/plugin-npm';
import { inc, valid } from 'semver';

import { detectPackages } from '../utils/detect-packages.js';
import { getCommitsSinceLastTag } from '../utils/git.js';
import type { ShipitOptions, ShipitResult } from '../utils/types.js';

export async function shipit(_bump?: string, options: ShipitOptions = {}): Promise<ShipitResult> {
  const rootPath = options.cwd || process.cwd();
  const gitOps = options.gitOps ?? defaultGitOperations;

  // 1. Load configuration
  const config = options.config ?? (await loadConfig(rootPath));

  // 2. Initialize Bonvoy with hooks
  const bonvoy = new Bonvoy(config);

  // 3. Load plugins (custom or default)
  const plugins = options.plugins ?? [
    new ConventionalPlugin(config.conventional),
    new ChangelogPlugin(config.changelog),
    new GitPlugin(config.git, gitOps),
    new NpmPlugin(config.npm),
    new GitHubPlugin(config.github),
  ];

  for (const plugin of plugins) {
    bonvoy.use(plugin);
  }

  // 4. Detect workspace packages
  const packages = options.packages ?? (await detectPackages(rootPath));

  // 5. Analyze commits since last release
  const commits = await getCommitsSinceLastTag(rootPath, gitOps);
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

  // Early return if no changes
  if (changedPackages.length === 0) {
    console.log('✅ No changes detected - nothing to release');
    return {
      packages,
      changedPackages: [],
      versions: {},
      bumps: {},
      changelogs: {},
      commits: commitsWithPackages,
    };
  }

  console.log(`📦 Releasing ${changedPackages.length} package(s):`);
  for (const pkg of changedPackages) {
    console.log(`  • ${pkg.name}: ${pkg.version} → ${versions[pkg.name]}`);
  }
  console.log('');

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
    for (const pkg of changedPackages) {
      // Update package.json version
      const pkgJsonPath = join(pkg.path, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      pkgJson.version = versions[pkg.name];
      writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`);

      // Write changelog
      const changelogPath = join(pkg.path, 'CHANGELOG.md');
      const changelog = changelogContext.changelogs[pkg.name] || '';
      writeFileSync(changelogPath, changelog);
    }

    // Write global changelog if enabled
    if (config.changelog?.global) {
      const globalChangelog = Object.values(changelogContext.changelogs).join('\n\n');
      writeFileSync(join(rootPath, 'CHANGELOG.md'), globalChangelog);
    }
  }

  // 8. Update package versions for publishing
  const packagesWithNewVersions = changedPackages.map((pkg) => ({
    ...pkg,
    version: versions[pkg.name],
  }));

  // 9. Publish packages
  const publishContext = {
    ...changelogContext,
    packages: packagesWithNewVersions,
    publishedPackages: [],
  };

  await bonvoy.hooks.beforePublish.promise(publishContext);
  await bonvoy.hooks.publish.promise(publishContext);
  await bonvoy.hooks.afterPublish.promise(publishContext);

  // 10. Create GitHub releases
  const releaseContext: ReleaseContext = {
    ...publishContext,
    releases: {},
  };

  await bonvoy.hooks.beforeRelease.promise(releaseContext);
  await bonvoy.hooks.makeRelease.promise(releaseContext);
  await bonvoy.hooks.afterRelease.promise(releaseContext);

  if (!options.dryRun) {
    console.log('\n🎉 Release completed successfully!');
  } else {
    console.log('\n🔍 Dry run completed - no changes made');
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
    if (options.dryRun) console.log('🔍 Dry run mode enabled\n');

    await shipit(bump, options);
  } catch (error) {
    console.error('❌ Release failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
