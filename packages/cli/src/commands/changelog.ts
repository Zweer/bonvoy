import type { ChangelogContext, Logger } from '@bonvoy/core';
import { Bonvoy, loadConfig, noopActionLog } from '@bonvoy/core';
import ChangelogPlugin from '@bonvoy/plugin-changelog';
import ConventionalPlugin from '@bonvoy/plugin-conventional';

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

export async function changelogCommand(options: { silent?: boolean } = {}): Promise<void> {
  const log = options.silent ? silentLogger : consoleLogger;
  try {
    const { changedPackages, commits } = await analyzeStatus({});

    if (changedPackages.length === 0) {
      log.info('✅ No pending changes - nothing to preview');
      return;
    }

    const config = await loadConfig(process.cwd());
    const bonvoy = new Bonvoy(config);
    bonvoy.use(new ConventionalPlugin(config.conventional));
    bonvoy.use(new ChangelogPlugin(config.changelog));

    const packages = changedPackages.map((c) => c.pkg);

    for (const { pkg } of changedPackages) {
      const pkgCommits = commits.filter((c) => c.packages.includes(pkg.name));
      const ctx: ChangelogContext = {
        config,
        packages,
        changedPackages: packages,
        rootPath: process.cwd(),
        isDryRun: true,
        actionLog: noopActionLog,
        /* c8 ignore start -- noop logger functions */
        logger: { info() {}, warn() {}, error() {} },
        /* c8 ignore stop */
        commits: pkgCommits,
        currentPackage: pkg,
        versions: Object.fromEntries(changedPackages.map((c) => [c.pkg.name, c.pkg.version])),
        bumps: Object.fromEntries(changedPackages.map((c) => [c.pkg.name, c.bump])),
        changelogs: {},
      };

      const generated = await bonvoy.hooks.generateChangelog.promise(ctx);
      /* c8 ignore start -- branch: generated can be non-string from waterfall hook */
      if (typeof generated === 'string' && generated) {
        log.info(`\n📦 ${pkg.name}\n${'─'.repeat(40)}`);
        log.info(generated);
      }
      /* c8 ignore stop */
    }
    /* c8 ignore start -- error handling */
  } catch (error) {
    log.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
  /* c8 ignore stop */
}
