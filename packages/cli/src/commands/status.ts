import type { Logger } from '@bonvoy/core';
import { inc } from 'semver';

import { analyzeStatus } from '../utils/analyze.js';

const noop = () => {};
const silentLogger: Logger = { info: noop, warn: noop, error: noop };
/* c8 ignore start - simple console wrappers */
const consoleLogger: Logger = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
/* c8 ignore stop */

export async function statusCommand(options: { silent?: boolean } = {}): Promise<void> {
  const log = options.silent ? silentLogger : consoleLogger;
  try {
    const { packages, changedPackages, commits } = await analyzeStatus({});

    if (changedPackages.length === 0) {
      log.info('✅ No pending changes');
      return;
    }

    log.info(`📦 ${changedPackages.length} package(s) with pending changes:\n`);

    for (const { pkg, bump } of changedPackages) {
      /* c8 ignore start -- inc() always returns string for valid bump types */
      const newVersion = inc(pkg.version, bump as 'major' | 'minor' | 'patch') ?? bump;
      /* c8 ignore stop */
      const commitCount = commits.filter((c) => c.packages.includes(pkg.name)).length;
      log.info(
        `  ${pkg.name}: ${pkg.version} → ${newVersion} (${bump}, ${commitCount} commit${commitCount !== 1 ? 's' : ''})`,
      );
    }

    log.info(`\n📝 ${commits.length} commit(s) since last release`);
    log.info(`📊 ${packages.length} total package(s) in workspace`);
    /* c8 ignore start -- error handling */
  } catch (error) {
    log.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
  /* c8 ignore stop */
}
