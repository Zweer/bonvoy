import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
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
}

export interface PrepareResult {
  branchName: string;
  packages: Package[];
  versions: Record<string, string>;
  prUrl?: string;
}

const noop = () => {};
const silentLogger: Logger = { info: noop, warn: noop, error: noop };
const consoleLogger: Logger = {
  info: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

/* c8 ignore start - wrapper function with simple branches */
export async function prepareCommand(options: { dryRun?: boolean } = {}): Promise<void> {
  try {
    const result = await prepare({ dryRun: options.dryRun });
    if (result.packages.length === 0) {
      console.log('No packages to release');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
/* c8 ignore stop */

export async function prepare(options: PrepareOptions = {}): Promise<PrepareResult> {
  const rootPath = options.cwd || process.cwd();
  const gitOps = options.gitOps ?? defaultGitOperations;
  const logger = options.silent ? silentLogger : consoleLogger;

  // 1. Load configuration
  let config = await loadConfig(rootPath);
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
  const packages = await detectPackages(rootPath);

  // 5. Analyze commits since last release
  const commits = await getCommitsSinceLastTag(rootPath, gitOps);
  const commitsWithPackages = assignCommitsToPackages(commits, packages, rootPath);

  // 6. Determine version bumps per package
  const changedPackages: Package[] = [];
  const versions: Record<string, string> = {};

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

    const bumpType: string | null = await bonvoy.hooks.getVersion.promise(context);

    /* c8 ignore start - branch coverage for complex conditions */
    if (bumpType && bumpType !== 'none') {
      let newVersion: string;
      if (bumpType === 'major' || bumpType === 'minor' || bumpType === 'patch') {
        const incremented = inc(pkg.version, bumpType);
        newVersion = incremented !== null ? incremented : pkg.version;
      } else if (valid(bumpType)) {
        newVersion = bumpType;
      } else {
        continue;
      }
      /* c8 ignore stop */
      versions[pkg.name] = newVersion;
      changedPackages.push(pkg);
    }
  }

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
  const commitMessage = `chore(release): prepare ${packageNames}`;

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
