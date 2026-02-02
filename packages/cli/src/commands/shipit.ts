import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  ChangelogContext,
  Context,
  Logger,
  Package,
  PRTrackingFile,
  ReleaseContext,
} from '@bonvoy/core';
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

const noop = () => {};
const silentLogger: Logger = { info: noop, warn: noop, error: noop };
const consoleLogger: Logger = {
  info: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

export async function shipit(_bump?: string, options: ShipitOptions = {}): Promise<ShipitResult> {
  const rootPath = options.cwd || process.cwd();
  const gitOps = options.gitOps ?? defaultGitOperations;
  const logger = options.silent ? silentLogger : consoleLogger;

  // 0. Auto-detect: check if we're on main with a merged release PR
  const trackingFilePath = join(rootPath, '.bonvoy', 'release-pr.json');
  const config = options.config ?? (await loadConfig(rootPath));
  const baseBranch = config.baseBranch || 'main';
  const currentBranch = await gitOps.getCurrentBranch(rootPath);

  if (currentBranch === baseBranch && existsSync(trackingFilePath)) {
    // Publish-only mode: release PR was merged
    return shipitPublishOnly(rootPath, trackingFilePath, config, gitOps, logger, options);
  }

  // 1. Initialize Bonvoy with hooks
  const bonvoy = new Bonvoy(config);

  // 2. Load plugins (custom or default)
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

  // 3. Detect workspace packages
  const packages = options.packages ?? (await detectPackages(rootPath));

  // 4. Analyze commits since last release
  const commits = await getCommitsSinceLastTag(rootPath, gitOps);
  const commitsWithPackages = assignCommitsToPackages(commits, packages, rootPath);

  // 5. Determine version bumps per package
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
      logger,
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
    logger.info('✅ No changes detected - nothing to release');
    return {
      packages,
      changedPackages: [],
      versions: {},
      bumps: {},
      changelogs: {},
      commits: commitsWithPackages,
    };
  }

  logger.info(`📦 Releasing ${changedPackages.length} package(s):`);
  for (const pkg of changedPackages) {
    logger.info(`  • ${pkg.name}: ${pkg.version} → ${versions[pkg.name]}`);
  }
  logger.info('');

  // 6. Validate before making any changes
  const validateContext: Context = {
    config,
    packages,
    changedPackages,
    rootPath,
    isDryRun: options.dryRun || false,
    logger,
    commits: commitsWithPackages,
    versions,
  };
  await bonvoy.hooks.validateRepo.promise(validateContext);

  // 7. Generate changelogs
  const changelogContext: ChangelogContext = {
    config,
    packages,
    changedPackages,
    rootPath,
    isDryRun: options.dryRun || false,
    logger,
    commits: commitsWithPackages,
    versions,
    bumps,
    changelogs: {},
  };

  await bonvoy.hooks.beforeChangelog.promise(changelogContext);
  await bonvoy.hooks.generateChangelog.promise(changelogContext);
  await bonvoy.hooks.afterChangelog.promise(changelogContext);

  if (!options.dryRun) {
    // First pass: update all package.json versions
    for (const pkg of changedPackages) {
      const pkgJsonPath = join(pkg.path, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      pkgJson.version = versions[pkg.name];
      writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`);
    }

    // Second pass: update internal dependencies to match new versions
    const packageNames = new Set(packages.map((p) => p.name));
    for (const pkg of packages) {
      const pkgJsonPath = join(pkg.path, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      let modified = false;

      for (const depType of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        const deps = pkgJson[depType];
        if (!deps) continue;

        for (const depName of Object.keys(deps)) {
          if (packageNames.has(depName) && versions[depName]) {
            // Update to the new version being released
            deps[depName] = `^${versions[depName]}`;
            modified = true;
          }
        }
      }

      if (modified) {
        writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`);
      }
    }

    // Write changelogs
    for (const pkg of changedPackages) {
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
    logger.info('\n🎉 Release completed successfully!');
  } else {
    logger.info('\n🔍 Dry run completed - no changes made');
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

async function shipitPublishOnly(
  rootPath: string,
  trackingFilePath: string,
  config: ReturnType<typeof loadConfig> extends Promise<infer T> ? T : never,
  gitOps: typeof defaultGitOperations,
  logger: Logger,
  options: ShipitOptions,
): Promise<ShipitResult> {
  const tracking: PRTrackingFile = JSON.parse(readFileSync(trackingFilePath, 'utf-8'));

  logger.info('🔀 Release PR merged - publish-only mode');
  logger.info(`📦 Publishing packages from PR #${tracking.prNumber}\n`);

  // Initialize Bonvoy with publish plugins only
  const bonvoy = new Bonvoy(config);
  bonvoy.use(new GitPlugin(config.git, gitOps));
  bonvoy.use(new NpmPlugin(config.npm));
  bonvoy.use(new GitHubPlugin(config.github));

  // Detect packages and filter to those in the release
  const allPackages = options.packages ?? (await detectPackages(rootPath));
  const packages = allPackages.filter((p) => tracking.packages.includes(p.name));

  // Build context for publish
  const versions: Record<string, string> = {};
  const bumps: Record<string, string> = {};
  const changelogs: Record<string, string> = {};

  for (const pkg of packages) {
    versions[pkg.name] = pkg.version; // Already bumped in PR
    bumps[pkg.name] = 'from-pr';

    // Read existing changelog
    const changelogPath = join(pkg.path, 'CHANGELOG.md');
    try {
      changelogs[pkg.name] = readFileSync(changelogPath, 'utf-8');
      /* c8 ignore start - file not found */
    } catch {
      changelogs[pkg.name] = '';
    }
    /* c8 ignore stop */
  }

  const publishContext = {
    config,
    packages,
    changedPackages: packages,
    rootPath,
    /* c8 ignore next */
    isDryRun: options.dryRun || false,
    logger,
    commits: [],
    versions,
    bumps,
    changelogs,
    publishedPackages: [] as string[],
  };

  // Publish
  await bonvoy.hooks.beforePublish.promise(publishContext);
  await bonvoy.hooks.publish.promise(publishContext);
  await bonvoy.hooks.afterPublish.promise(publishContext);

  // Create releases
  const releaseContext: ReleaseContext = { ...publishContext, releases: {} };
  await bonvoy.hooks.beforeRelease.promise(releaseContext);
  await bonvoy.hooks.makeRelease.promise(releaseContext);
  await bonvoy.hooks.afterRelease.promise(releaseContext);

  // Clean up tracking file
  /* c8 ignore start - requires real git operations */
  if (!options.dryRun) {
    rmSync(trackingFilePath);
    await gitOps.add('.bonvoy/release-pr.json', rootPath);
    await gitOps.commit('chore: clean up release PR tracking file', rootPath);
    await gitOps.push(rootPath);

    logger.info('\n🎉 Publish completed successfully!');
  } else {
    logger.info('\n🔍 Dry run completed - no changes made');
  }
  /* c8 ignore stop */

  return {
    packages: allPackages,
    changedPackages: packages,
    versions,
    bumps,
    changelogs,
    commits: [],
  };
}

function parseForceBump(bump: string): string {
  return bump;
}

export async function shipitCommand(
  bump?: string,
  options: { dryRun?: boolean; json?: boolean; package?: string[] } = {},
): Promise<void> {
  try {
    if (!options.json) {
      console.log('🚢 Starting bonvoy release...');
      if (options.dryRun) console.log('🔍 Dry run mode enabled\n');
    }

    const result = await shipit(bump, { ...options, silent: options.json });

    if (options.json) {
      /* c8 ignore start - JSON output tested via shipit function */
      console.log(
        JSON.stringify(
          {
            success: true,
            dryRun: options.dryRun ?? false,
            released: result.changedPackages.map((pkg) => ({
              name: pkg.name,
              version: result.versions[pkg.name],
              bump: result.bumps[pkg.name],
            })),
            changelogs: result.changelogs,
          },
          null,
          2,
        ),
      );
      /* c8 ignore stop */
    }
  } catch (error) {
    const errorMessage = String(error instanceof Error ? error.message : error);
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: errorMessage }));
      process.exit(1);
    }
    console.error('❌ Release failed:', errorMessage);
    process.exit(1);
  }
}
