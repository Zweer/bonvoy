import { createLogger } from '@bonvoy/core';
import { inc } from 'semver';

import { analyzeStatus } from '../utils/analyze.js';
import { resolveLogLevel } from './shipit.js';

export async function statusCommand(
  options: { silent?: boolean; verbose?: boolean; quiet?: boolean; all?: boolean } = {},
): Promise<void> {
  const log = createLogger(resolveLogLevel(options));
  try {
    const { packages, changedPackages, commits } = await analyzeStatus({});

    if (options.all) {
      log.info(`📊 ${packages.length} package(s) in workspace:\n`);
      for (const pkg of packages) {
        const changed = changedPackages.find((c) => c.pkg.name === pkg.name);
        if (changed) {
          /* c8 ignore start -- inc() always returns string for valid bump types */
          const newVersion =
            inc(pkg.version, changed.bump as 'major' | 'minor' | 'patch') ?? changed.bump;
          /* c8 ignore stop */
          log.info(`  ${pkg.name}: ${pkg.version} → ${newVersion} (${changed.bump})`);
        } else {
          log.info(`  ${pkg.name}: ${pkg.version}`);
        }
      }
      if (changedPackages.length > 0) {
        log.info(`\n📝 ${commits.length} commit(s) since last release`);
      }
      return;
    }

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
