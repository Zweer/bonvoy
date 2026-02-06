import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  ChangelogContext,
  Context,
  Logger,
  Package,
  PRTrackingFile,
  ReleaseContext,
  VersionContext,
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
/* c8 ignore start - simple console wrappers */
const consoleLogger: Logger = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
/* c8 ignore stop */

export async function shipit(_bump?: string, options: ShipitOptions = {}): Promise<ShipitResult> {
  const rootPath = options.cwd || process.cwd();
  const gitOps = options.gitOps ?? defaultGitOperations;
  const logger = options.silent ? silentLogger : consoleLogger;

  // 0. Auto-detect: check if we're on main with a merged release PR
  const trackingFilePath = join(rootPath, '.bonvoy', 'release-pr.json');
  let config = options.config ?? (await loadConfig(rootPath));
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
    new GitPlugin(
      {
        ...config.git,
        commitMessage: config.git?.commitMessage ?? config.commitMessage,
        tagFormat: config.git?.tagFormat ?? config.tagFormat,
      },
      gitOps,
    ),
    new NpmPlugin(config.npm),
    new GitHubPlugin({
      ...config.github,
      tagFormat: config.github?.tagFormat ?? config.tagFormat,
    }),
  ];

  for (const plugin of plugins) {
    bonvoy.use(plugin);
  }

  // 2.5. Allow plugins to modify config
  config = await bonvoy.hooks.modifyConfig.promise(config);

  // 3. Detect workspace packages
  let packages = options.packages ?? (await detectPackages(rootPath));

  // 3.5. Filter packages if --package option is provided
  if (options.package?.length) {
    const selected = new Set(options.package);
    packages = packages.filter((p) => selected.has(p.name));
  }

  // 4. Analyze commits since last release
  const commits = await getCommitsSinceLastTag(rootPath, gitOps);
  const commitsWithPackages = assignCommitsToPackages(commits, packages, rootPath);

  // 4.5. Run beforeShipIt hook (used by changeset, exec plugins)
  const initialContext: Context = {
    config,
    packages,
    changedPackages: [],
    rootPath,
    isDryRun: options.dryRun || false,
    logger,
    commits: commitsWithPackages,
  };
  await bonvoy.hooks.beforeShipIt.promise(initialContext);

  // 5. Determine version bumps per package
  const changedPackages: Package[] = [];
  const versions: Record<string, string> = {};
  const bumps: Record<string, string> = {};

  // Parse force bump if provided
  const forceBump = _bump ? parseForceBump(_bump) : null;
  const isFixed = config.versioning === 'fixed';

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
      if (bumpType === 'prerelease') {
        // Prerelease bump: 1.0.0 → 1.0.1-beta.0 or 1.0.0-beta.0 → 1.0.0-beta.1
        const preid = options.preid;
        /* c8 ignore start - inc() always returns valid string for prerelease */
        newVersion =
          (preid ? inc(pkg.version, 'prerelease', preid) : inc(pkg.version, 'prerelease')) ||
          pkg.version;
        /* c8 ignore stop */
      } else if (bumpType === 'major' || bumpType === 'minor' || bumpType === 'patch') {
        newVersion = inc(pkg.version, bumpType) || pkg.version;
      } else {
        // Explicit version - validate it's a valid semver
        if (!valid(bumpType)) {
          throw new Error(
            `Invalid version "${bumpType}" for package ${pkg.name}. Must be a valid semver version or bump type (major/minor/patch/prerelease).`,
          );
        }
        newVersion = bumpType;
      }
      versions[pkg.name] = newVersion;
      bumps[pkg.name] = bumpType;
      changedPackages.push(pkg);
    }
  }

  // Fixed versioning: apply highest bump to ALL packages
  /* c8 ignore start -- fixed versioning branches tested via integration */
  if (isFixed && changedPackages.length > 0) {
    const bumpPriority: Record<string, number> = { patch: 1, minor: 2, major: 3, prerelease: 0 };
    const highestBump = Object.values(bumps).reduce((highest, bump) => {
      if (valid(bump)) return bump; // Explicit version wins
      return (bumpPriority[bump] ?? 0) > (bumpPriority[highest] ?? 0) ? bump : highest;
    });

    // Find the highest current version as base
    const maxVersion = packages.reduce(
      (max, pkg) => (pkg.version > max ? pkg.version : max),
      '0.0.0',
    );

    let newVersion: string;
    if (valid(highestBump)) {
      newVersion = highestBump;
    } else if (highestBump === 'prerelease') {
      const preid = options.preid;
      newVersion =
        (preid ? inc(maxVersion, 'prerelease', preid) : inc(maxVersion, 'prerelease')) ||
        maxVersion;
    } else {
      newVersion = inc(maxVersion, highestBump as 'major' | 'minor' | 'patch') || maxVersion;
    }

    // Apply to all packages
    changedPackages.length = 0;
    for (const pkg of packages) {
      versions[pkg.name] = newVersion;
      bumps[pkg.name] = highestBump;
      changedPackages.push(pkg);
    }
  }
  /* c8 ignore stop */

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

  // 6.5. Run version hooks (allows plugins to modify versions)
  const versionContext: VersionContext = {
    ...validateContext,
    versions,
    bumps,
  };
  await bonvoy.hooks.version.promise(versionContext);
  await bonvoy.hooks.afterVersion.promise(versionContext);

  // 7. Generate changelogs per package
  const changelogs: Record<string, string> = {};

  for (const pkg of changedPackages) {
    const pkgCommits = commitsWithPackages.filter((c) => c.packages.includes(pkg.name));
    const changelogContext: ChangelogContext = {
      config,
      packages,
      changedPackages,
      rootPath,
      isDryRun: options.dryRun || false,
      logger,
      commits: pkgCommits,
      currentPackage: pkg,
      versions,
      bumps,
      changelogs,
    };

    await bonvoy.hooks.beforeChangelog.promise(changelogContext);
    const generated = await bonvoy.hooks.generateChangelog.promise(changelogContext);
    if (typeof generated === 'string' && generated) {
      changelogs[pkg.name] = generated;
    }
    await bonvoy.hooks.afterChangelog.promise(changelogContext);
  }

  if (!options.dryRun) {
    // Update all package.json versions
    for (const pkg of changedPackages) {
      const pkgJsonPath = join(pkg.path, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      pkgJson.version = versions[pkg.name];
      writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`);
    }

    // Update internal dependencies to match new versions
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
            deps[depName] = `^${versions[depName]}`;
            modified = true;
          }
        }
      }

      if (modified) {
        writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`);
      }
    }

    // Note: changelogs are written by the ChangelogPlugin via afterChangelog hook

    // Update root package.json version (monorepo only)
    /* c8 ignore start -- rootVersionStrategy tested via integration */
    try {
      const rootPkgPath = join(rootPath, 'package.json');
      const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
      if (rootPkg.workspaces && config.rootVersionStrategy !== 'none') {
        const strategy = config.rootVersionStrategy || 'max';
        const newVersions = Object.values(versions);
        /* c8 ignore next */
        let rootVersion: string | null = null;

        if (strategy === 'max') {
          rootVersion = newVersions.sort((a, b) => (a > b ? -1 : 1))[0] ?? null;
          /* c8 ignore next */
        } else if (strategy === 'patch') {
          rootVersion = inc(rootPkg.version, 'patch');
        }

        /* c8 ignore next */
        if (rootVersion && rootVersion !== rootPkg.version) {
          rootPkg.version = rootVersion;
          writeFileSync(rootPkgPath, `${JSON.stringify(rootPkg, null, 2)}\n`);
          logger.info(`📦 Root package bumped to ${rootVersion} (strategy: ${strategy})`);
        }
      }
    } catch {
      // Root package.json not found or not readable - skip
    }
    /* c8 ignore stop */
  }

  // 8. Update package versions for publishing
  const packagesWithNewVersions = changedPackages.map((pkg) => ({
    ...pkg,
    version: versions[pkg.name],
  }));

  // 9. Publish packages
  const publishContext = {
    config,
    packages: packagesWithNewVersions,
    changedPackages,
    rootPath,
    isDryRun: options.dryRun || false,
    logger,
    commits: commitsWithPackages,
    versions,
    bumps,
    changelogs,
    publishedPackages: [] as string[],
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
    // Write release log for rollback tracking
    try {
      const bonvoyDir = join(rootPath, '.bonvoy');
      mkdirSync(bonvoyDir, { recursive: true });
      writeFileSync(
        join(bonvoyDir, 'release-log.json'),
        `${JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            packages: changedPackages.map((pkg) => ({
              name: pkg.name,
              from: pkg.version,
              to: versions[pkg.name],
            })),
            tags: changedPackages.map((pkg) => {
              const tagFormat = config.tagFormat || '{name}@{version}';
              return tagFormat.replace('{name}', pkg.name).replace('{version}', versions[pkg.name]);
            }),
            published: publishContext.publishedPackages,
          },
          null,
          2,
        )}\n`,
      );
      logger.info('📋 Release log saved to .bonvoy/release-log.json');
      /* c8 ignore next 3 -- non-fatal error handling */
    } catch {
      // Could not write release log - non-fatal
    }

    logger.info('\n🎉 Release completed successfully!');
  } else {
    logger.info('\n🔍 Dry run completed - no changes made');
  }

  return {
    packages,
    changedPackages,
    versions,
    bumps,
    changelogs,
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
  options: {
    dryRun?: boolean;
    json?: boolean;
    package?: string[];
    preid?: string;
    silent?: boolean;
  } = {},
): Promise<void> {
  const log = options.silent ? silentLogger : consoleLogger;
  try {
    if (!options.json) {
      log.info('🚢 Starting bonvoy release...');
      if (options.dryRun) log.info('🔍 Dry run mode enabled\n');
    }

    const result = await shipit(bump, { ...options, silent: options.json || options.silent });

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
    log.error(`❌ Release failed: ${errorMessage}`);
    process.exit(1);
  }
}
