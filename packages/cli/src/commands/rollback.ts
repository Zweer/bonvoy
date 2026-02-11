import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Logger, RollbackContext } from '@bonvoy/core';
import { ActionLog, Bonvoy, createLogger, loadConfig, noopActionLog } from '@bonvoy/core';
import ChangelogPlugin from '@bonvoy/plugin-changelog';
import ConventionalPlugin from '@bonvoy/plugin-conventional';
import GitPlugin from '@bonvoy/plugin-git';
import GitHubPlugin from '@bonvoy/plugin-github';
import NpmPlugin from '@bonvoy/plugin-npm';

import { detectPackages } from '../utils/detect-packages.js';
import { resolveLogLevel } from './shipit.js';

const RELEASE_LOG_PATH = '.bonvoy/release-log.json';

export async function rollback(
  options: {
    dryRun?: boolean;
    force?: boolean;
    cwd?: string;
    silent?: boolean;
    verbose?: boolean;
    quiet?: boolean;
    logger?: Logger;
  } = {},
): Promise<void> {
  const rootPath = options.cwd || process.cwd();
  const logger = options.logger ?? createLogger(resolveLogLevel(options));
  const logPath = join(rootPath, RELEASE_LOG_PATH);

  if (!existsSync(logPath)) {
    throw new Error('No release log found at .bonvoy/release-log.json — nothing to rollback.');
  }

  const releaseLog = ActionLog.load(logPath);

  if (releaseLog.status === 'rolled-back') {
    logger.info('✅ Already rolled back — nothing to do.');
    return;
  }

  if (
    releaseLog.status !== 'in-progress' &&
    releaseLog.status !== 'completed' &&
    releaseLog.status !== 'rollback-failed'
  ) {
    throw new Error(
      `Unexpected release log status: "${releaseLog.status}". Delete .bonvoy/release-log.json and try again.`,
    );
  }

  logger.info('↩️  Rolling back release...');
  logger.info(`  Started at: ${releaseLog.startedAt}`);
  logger.info(
    `  Packages: ${releaseLog.packages.map((p) => `${p.name} ${p.from} → ${p.to}`).join(', ')}`,
  );
  logger.info(`  Actions to undo: ${releaseLog.actions.length}`);
  logger.info('');

  if (options.dryRun) {
    for (const action of [...releaseLog.actions].reverse()) {
      logger.info(
        `  [dry-run] Would undo: ${action.plugin}.${action.action} (${JSON.stringify(action.data)})`,
      );
    }
    logger.info('\n🔍 Dry run completed — no changes made');
    return;
  }

  // Initialize bonvoy with plugins so they can handle rollback
  const config = await loadConfig(rootPath);
  const bonvoy = new Bonvoy(config);

  const plugins = [
    new ConventionalPlugin(config.conventional),
    new ChangelogPlugin(config.changelog),
    new GitPlugin({
      ...config.git,
      commitMessage: config.git?.commitMessage ?? config.commitMessage,
      tagFormat: config.git?.tagFormat ?? config.tagFormat,
    }),
    new NpmPlugin(config.npm),
    new GitHubPlugin({
      ...config.github,
      tagFormat: config.github?.tagFormat ?? config.tagFormat,
    }),
  ];

  for (const plugin of plugins) {
    bonvoy.use(plugin);
  }

  const packages = await detectPackages(rootPath);

  const rollbackContext: RollbackContext = {
    config,
    packages,
    changedPackages: [],
    rootPath,
    isDryRun: false,
    logger,
    actionLog: noopActionLog,
    actions: releaseLog.actions,
    errors: [],
  };

  // Re-create a writable ActionLog pointing to the same file so we can update status
  const actionLogWriter = new ActionLog(logPath, releaseLog.config, releaseLog.packages);
  // Copy existing actions
  for (const action of releaseLog.actions) {
    actionLogWriter.record({ plugin: action.plugin, action: action.action, data: action.data });
  }

  try {
    await bonvoy.hooks.rollback.promise(rollbackContext);
    actionLogWriter.markRolledBack();
    logger.info('\n✅ Rollback completed successfully');
  } catch (error) {
    actionLogWriter.markRollbackFailed();
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`\n⚠️  Rollback partially failed: ${msg}`);
    logger.error('Check .bonvoy/release-log.json for details and fix manually.');
    throw error;
  }
}

export async function rollbackCommand(
  options: { dryRun?: boolean; force?: boolean; verbose?: boolean; quiet?: boolean } = {},
): Promise<void> {
  const logger = createLogger(resolveLogLevel(options));
  try {
    logger.info('↩️  bonvoy rollback\n');
    await rollback(options);
  } catch (error) {
    /* c8 ignore start -- defensive: rollback always throws Error */
    const msg = error instanceof Error ? error.message : String(error);
    /* c8 ignore stop */
    logger.error(`\n❌ ${msg}`);
    process.exitCode = 1;
  }
}
