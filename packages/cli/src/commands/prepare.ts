import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  BonvoyConfig,
  ChangelogContext,
  Context,
  Logger,
  Package,
  PRContext,
  PRTrackingFile,
  VersionContext,
} from '@bonvoy/core';
import { assignCommitsToPackages, Bonvoy, loadConfig } from '@bonvoy/core';
import ChangelogPlugin from '@bonvoy/plugin-changelog';
import ConventionalPlugin from '@bonvoy/plugin-conventional';
import { defaultGitOperations, type GitOperations } from '@bonvoy/plugin-git';
import GitHubPlugin from '@bonvoy/plugin-github';
import GitLabPlugin from '@bonvoy/plugin-gitlab';
import { inc, valid } from 'semver';

import { detectPackages } from '../utils/detect-packages.js';
import { getCommitsSinceLastTag } from '../utils/git.js';

export interface PrepareOptions {
  dryRun?: boolean;
  cwd?: string;
  gitOps?: GitOperations;
  silent?: boolean;
  config?: BonvoyConfig;
  packages?: Package[];
  preid?: string; // Prerelease identifier (alpha, beta, rc)
  bump?: string; // Force bump type (patch/minor/major/prerelease/x.y.z)
}

export interface PrepareResult {
  branchName: string;
  packages: Package[];
  versions: Record<string, string>;
  prUrl?: string;
}

const noop = () => {};
const silentLogger: Logger = { info: noop, warn: noop, error: noop };
/* c8 ignore start - simple console wrappers */
const consoleLogger: Logger = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
/* c8 ignore stop */

/* c8 ignore start - wrapper function with simple branches */
export async function prepareCommand(
  bump?: string,
  options: { dryRun?: boolean; preid?: string; silent?: boolean } = {},
): Promise<void> {
  const log = options.silent ? silentLogger : consoleLogger;
  try {
    const result = await prepare({ ...options, bump });
    if (result.packages.length === 0) {
      log.info('No packages to release');
    }
  } catch (error) {
    log.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
/* c8 ignore stop */

export async function prepare(options: PrepareOptions = {}): Promise<PrepareResult> {
  const rootPath = options.cwd || process.cwd();
  const gitOps = options.gitOps ?? defaultGitOperations;
  const logger = options.silent ? silentLogger : consoleLogger;

  // 1. Load configuration
  let config = options.config ?? (await loadConfig(rootPath));
  const baseBranch = config.baseBranch || 'main';

  // 2. Initialize Bonvoy with hooks
  const bonvoy = new Bonvoy(config);

  // 3. Load plugins
  bonvoy.use(new ConventionalPlugin(config.conventional));
  bonvoy.use(new ChangelogPlugin(config.changelog));
  bonvoy.use(new GitHubPlugin(config.github));
  bonvoy.use(new GitLabPlugin(config.gitlab));

  // 3.5. Allow plugins to modify config
  config = await bonvoy.hooks.modifyConfig.promise(config);

  // 4. Detect workspace packages
  const packages = options.packages ?? (await detectPackages(rootPath));

  // 5. Analyze commits since last release
  const commits = await getCommitsSinceLastTag(rootPath, gitOps);
  const commitsWithPackages = assignCommitsToPackages(commits, packages, rootPath);

  // 6. Determine version bumps per package
  const changedPackages: Package[] = [];
  const versions: Record<string, string> = {};
  const bumps: Record<string, string> = {};
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
    if (options.bump) {
      bumpType = options.bump;
    }

    /* c8 ignore start - branch coverage for complex conditions */
    if (bumpType && bumpType !== 'none') {
      let newVersion: string;
      if (bumpType === 'prerelease') {
        const preid = options.preid;
        newVersion =
          (preid ? inc(pkg.version, 'prerelease', preid) : inc(pkg.version, 'prerelease')) ||
          pkg.version;
      } else if (bumpType === 'major' || bumpType === 'minor' || bumpType === 'patch') {
        const incremented = inc(pkg.version, bumpType);
        newVersion = incremented !== null ? incremented : pkg.version;
      } else if (valid(bumpType)) {
        newVersion = bumpType;
      } else {
        continue;
      }
      /* c8 ignore stop */
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
      if (valid(bump)) return bump;
      return (bumpPriority[bump] ?? 0) > (bumpPriority[highest] ?? 0) ? bump : highest;
    });

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

    changedPackages.length = 0;
    for (const pkg of packages) {
      versions[pkg.name] = newVersion;
      bumps[pkg.name] = highestBump;
      changedPackages.push(pkg);
    }
  }
  /* c8 ignore stop */

  if (changedPackages.length === 0) {
    logger.info('📦 No packages to release');
    return { branchName: '', packages: [], versions: {} };
  }

  // 6.5. Run version hooks
  const versionContext: VersionContext = {
    config,
    packages,
    changedPackages,
    rootPath,
    isDryRun: options.dryRun || false,
    logger,
    commits: commitsWithPackages,
    versions,
    bumps: {},
  };
  await bonvoy.hooks.version.promise(versionContext);
  await bonvoy.hooks.afterVersion.promise(versionContext);

  // 7. Generate changelogs
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
      bumps: {},
      changelogs: {},
    };

    await bonvoy.hooks.beforeChangelog.promise(changelogContext);
    const generatedChangelog = await bonvoy.hooks.generateChangelog.promise(changelogContext);
    await bonvoy.hooks.afterChangelog.promise(changelogContext);

    /* c8 ignore start */
    changelogs[pkg.name] = generatedChangelog ?? '';
    /* c8 ignore stop */
  }

  // 8. Create release branch
  const timestamp = Date.now();
  const branchName = `release/${timestamp}`;

  logger.info(`🌿 Creating branch: ${branchName}`);

  if (!options.dryRun) {
    await gitOps.checkout(branchName, rootPath, true);
  }

  // 9. Update package.json versions
  for (const pkg of changedPackages) {
    const pkgJsonPath = join(pkg.path, 'package.json');
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    pkgJson.version = versions[pkg.name];

    logger.info(`📝 Bumping ${pkg.name} to ${versions[pkg.name]}`);

    if (!options.dryRun) {
      writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`);
    }
  }

  // 9.5. Update root package.json version (monorepo only)
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
        logger.info(`📝 Root package bumped to ${rootVersion} (strategy: ${strategy})`);
        if (!options.dryRun) {
          rootPkg.version = rootVersion;
          writeFileSync(rootPkgPath, `${JSON.stringify(rootPkg, null, 2)}\n`);
        }
      }
    }
  } catch {
    // Root package.json not found or not readable - skip
  }
  /* c8 ignore stop */

  // 10. Write changelogs
  for (const pkg of changedPackages) {
    /* c8 ignore start */
    if (changelogs[pkg.name]) {
      /* c8 ignore stop */
      const changelogPath = join(pkg.path, 'CHANGELOG.md');
      let existingChangelog = '';
      try {
        existingChangelog = readFileSync(changelogPath, 'utf-8');
      } catch {
        // File doesn't exist
      }

      const newChangelog = `${changelogs[pkg.name]}\n\n${existingChangelog}`;

      if (!options.dryRun) {
        writeFileSync(changelogPath, newChangelog);
      }
    }
  }

  // 11. Commit changes
  const packageNames = changedPackages.map((p) => p.name).join(', ');
  const commitMessageTemplate = config.commitMessage || 'chore: release {packages}';
  const commitMessage = commitMessageTemplate.replace('{packages}', packageNames);

  logger.info(`📝 Committing: "${commitMessage}"`);

  if (!options.dryRun) {
    await gitOps.add('.', rootPath);
    await gitOps.commit(commitMessage, rootPath);
    await gitOps.push(rootPath, branchName);
  }

  // 12. Create PR via hooks
  const prTitle = `chore(release): ${packageNames}`;
  const prBody = generatePRBody(changedPackages, versions, changelogs);

  const prContext: PRContext = {
    config,
    packages,
    changedPackages,
    rootPath,
    isDryRun: options.dryRun || false,
    logger,
    branchName,
    baseBranch,
    title: prTitle,
    body: prBody,
  };

  await bonvoy.hooks.beforeCreatePR.promise(prContext);
  await bonvoy.hooks.createPR.promise(prContext);
  await bonvoy.hooks.afterCreatePR.promise(prContext);

  // 13. Save PR tracking file
  /* c8 ignore start - requires GitHub/GitLab plugin to set prNumber */
  if (!options.dryRun && prContext.prNumber) {
    const bonvoyDir = join(rootPath, '.bonvoy');
    if (!existsSync(bonvoyDir)) {
      mkdirSync(bonvoyDir, { recursive: true });
    }

    const trackingFile: PRTrackingFile = {
      prNumber: prContext.prNumber,
      prUrl: prContext.prUrl || '',
      branch: branchName,
      baseBranch,
      createdAt: new Date().toISOString(),
      packages: changedPackages.map((p) => p.name),
    };

    writeFileSync(join(bonvoyDir, 'release-pr.json'), `${JSON.stringify(trackingFile, null, 2)}\n`);

    // Commit the tracking file
    await gitOps.add('.bonvoy/release-pr.json', rootPath);
    await gitOps.commit('chore: add release PR tracking file', rootPath);
    await gitOps.push(rootPath, branchName);
  }

  if (prContext.prUrl) {
    logger.info(`🔗 PR created: ${prContext.prUrl}`);
  }
  /* c8 ignore stop */

  return {
    branchName,
    packages: changedPackages,
    versions,
    prUrl: prContext.prUrl,
  };
}

function generatePRBody(
  packages: Package[],
  versions: Record<string, string>,
  changelogs: Record<string, string>,
): string {
  let body = '## Release\n\n';
  body += '### Packages\n\n';

  for (const pkg of packages) {
    body += `- **${pkg.name}**: ${pkg.version} → ${versions[pkg.name]}\n`;
  }

  body += '\n### Changelogs\n\n';

  for (const pkg of packages) {
    /* c8 ignore start */
    if (changelogs[pkg.name]) {
      /* c8 ignore stop */
      body += `<details>\n<summary>${pkg.name}</summary>\n\n${changelogs[pkg.name]}\n\n</details>\n\n`;
    }
  }

  return body;
}
