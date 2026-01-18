#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ChangelogContext, CommitInfo, Context, Package, SemverBump } from '@bonvoy/core';
import { assignCommitsToPackages, Bonvoy, loadConfig } from '@bonvoy/core';
import ChangelogPlugin from '@bonvoy/plugin-changelog';
import ConventionalPlugin from '@bonvoy/plugin-conventional';
import GitPlugin from '@bonvoy/plugin-git';
import NpmPlugin from '@bonvoy/plugin-npm';
import type { Command } from '@commander-js/extra-typings';
import { execa } from 'execa';
import { inc } from 'semver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

async function detectPackages(rootPath: string): Promise<Package[]> {
  const rootPkgPath = join(rootPath, 'package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));

  const packages: Package[] = [];

  // Check if it's a workspace
  if (rootPkg.workspaces) {
    const { stdout } = await execa('npm', ['query', '.workspace'], { cwd: rootPath });
    const workspaces = JSON.parse(stdout);

    for (const ws of workspaces) {
      packages.push({
        name: ws.name,
        version: ws.version,
        path: ws.location,
        private: ws.private,
        dependencies: ws.dependencies,
        devDependencies: ws.devDependencies,
      });
    }
  } else {
    // Single package
    packages.push({
      name: rootPkg.name,
      version: rootPkg.version,
      path: rootPath,
      private: rootPkg.private,
      dependencies: rootPkg.dependencies,
      devDependencies: rootPkg.devDependencies,
    });
  }

  return packages;
}

async function getCommitsSinceLastTag(rootPath: string): Promise<CommitInfo[]> {
  try {
    // Get last tag
    const { stdout: lastTag } = await execa('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: rootPath,
    });

    // Get commits since last tag
    const { stdout } = await execa(
      'git',
      ['log', `${lastTag}..HEAD`, '--pretty=format:%H|%s|%an|%aI', '--name-only'],
      { cwd: rootPath },
    );

    return parseGitLog(stdout);
  } catch {
    // No tags yet, get all commits
    const { stdout } = await execa('git', ['log', '--pretty=format:%H|%s|%an|%aI', '--name-only'], {
      cwd: rootPath,
    });

    return parseGitLog(stdout);
  }
}

function parseGitLog(output: string): CommitInfo[] {
  const commits: CommitInfo[] = [];
  const blocks = output.split('\n\n');

  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    if (lines.length === 0) continue;

    const [hash, message, author, date] = lines[0].split('|');
    const files = lines.slice(1);

    commits.push({
      hash,
      message,
      author,
      date: new Date(date),
      files,
      packages: [],
    });
  }

  return commits;
}

async function shipit(bump?: string, options: { dryRun?: boolean; package?: string[] } = {}) {
  try {
    console.log('🚢 Starting bonvoy release...');
    if (options.dryRun) console.log('🔍 Dry run mode enabled');

    const rootPath = process.cwd();

    // 1. Load configuration
    const config = await loadConfig();
    console.log('✅ Configuration loaded');

    // 2. Initialize Bonvoy with hooks
    const bonvoy = new Bonvoy(config);

    // 3. Load default plugins
    bonvoy.use(new ConventionalPlugin(config.conventional));
    bonvoy.use(new ChangelogPlugin(config.changelog));
    bonvoy.use(new GitPlugin(config.git));
    bonvoy.use(new NpmPlugin(config.npm));
    console.log('✅ Plugins loaded');

    // 4. Detect workspace packages
    const packages = await detectPackages(rootPath);
    console.log(`✅ Detected ${packages.length} package(s)`);

    // 5. Analyze commits since last release
    const commits = await getCommitsSinceLastTag(rootPath);
    const commitsWithPackages = assignCommitsToPackages(commits, packages, rootPath);
    console.log(`✅ Analyzed ${commits.length} commit(s)`);

    // 6. Determine version bumps per package
    const changedPackages: Package[] = [];
    const versions: Record<string, string> = {};
    const bumps: Record<string, SemverBump> = {};

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

      const bumpType = await bonvoy.hooks.getVersion.promise(context);

      if (bumpType && bumpType !== 'none') {
        const newVersion = inc(pkg.version, bumpType) || pkg.version;
        versions[pkg.name] = newVersion;
        bumps[pkg.name] = bumpType;
        changedPackages.push(pkg);
        console.log(`  ${pkg.name}: ${pkg.version} → ${newVersion} (${bumpType})`);
      }
    }

    if (changedPackages.length === 0) {
      console.log('✅ No changes detected - nothing to release');
      return;
    }

    console.log(`✅ ${changedPackages.length} package(s) to release`);

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
    console.log('✅ Changelogs generated');

    if (options.dryRun) {
      console.log('🔍 Dry run completed - no changes made');
      return;
    }

    // 8. Publish packages
    const publishContext = {
      ...changelogContext,
      publishedPackages: [],
    };

    await bonvoy.hooks.beforePublish.promise(publishContext);
    await bonvoy.hooks.publish.promise(publishContext);
    await bonvoy.hooks.afterPublish.promise(publishContext);

    console.log('🎉 Release completed successfully!');
  } catch (error) {
    console.error('❌ Release failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export function createProgram(): Command {
  const { Command } = require('commander');
  const prog = new Command()
    .name('bonvoy')
    .description('🚢 Bon voyage to your releases!')
    .version(packageJson.version);

  prog
    .command('shipit')
    .description('Release all changed packages')
    .option('--dry-run', 'Preview changes without executing')
    .option('--package <name...>', 'Only release specific package(s)')
    .argument('[bump]', 'Version bump (patch/minor/major/x.y.z)')
    .action(shipit);

  prog
    .command('prepare')
    .description('Create release PR')
    .action(async () => {
      console.log('🔄 Creating release PR...');
      console.log('Not implemented yet');
    });

  prog
    .command('status')
    .description('Show pending changes')
    .action(async () => {
      console.log('📊 Checking status...');
      console.log('Not implemented yet');
    });

  prog
    .command('changelog')
    .description('Preview changelog')
    .action(async () => {
      console.log('📝 Generating changelog preview...');
      console.log('Not implemented yet');
    });

  return prog;
}
