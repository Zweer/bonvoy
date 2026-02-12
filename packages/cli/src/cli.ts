#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from '@commander-js/extra-typings';

import { changelogCommand } from './commands/changelog.js';
import { prepareCommand } from './commands/prepare.js';
import { rollbackCommand } from './commands/rollback.js';
import { shipitCommand } from './commands/shipit.js';
import { statusCommand } from './commands/status.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createProgram(): Command {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

  const prog = new Command()
    .name('bonvoy')
    .description('🚢 Bon voyage to your releases!')
    .version(packageJson.version);

  prog
    .command('shipit')
    .description('Release all changed packages')
    .option('--dry-run', 'Preview changes without executing')
    .option('--json', 'Output results as JSON (for CI)')
    .option('--package <name...>', 'Only release specific package(s)')
    .option('--preid <identifier>', 'Prerelease identifier (alpha, beta, rc)')
    .option('--force', 'Skip stale release log check')
    .option('--verbose', 'Show debug output')
    .option('--quiet', 'Only show warnings and errors')
    .argument('[bump]', 'Version bump (patch/minor/major/prerelease/x.y.z)')
    .action(shipitCommand);

  prog
    .command('prepare')
    .description('Create release PR')
    .option('--dry-run', 'Preview changes without creating PR')
    .option('--preid <identifier>', 'Prerelease identifier (alpha, beta, rc)')
    .option('--verbose', 'Show debug output')
    .option('--quiet', 'Only show warnings and errors')
    .argument('[bump]', 'Version bump (patch/minor/major/prerelease/x.y.z)')
    .action(prepareCommand);

  prog
    .command('status')
    .description('Show pending changes')
    .option('--all', 'Show all packages, not just changed ones')
    .option('--verbose', 'Show debug output')
    .option('--quiet', 'Only show warnings and errors')
    .action(statusCommand);

  prog
    .command('changelog')
    .description('Preview changelog')
    .option('--verbose', 'Show debug output')
    .option('--quiet', 'Only show warnings and errors')
    .action(changelogCommand);

  prog
    .command('rollback')
    .description('Rollback last release')
    .option('--dry-run', 'Preview rollback without executing')
    .option('--force', 'Skip confirmation')
    .option('--verbose', 'Show debug output')
    .option('--quiet', 'Only show warnings and errors')
    .action(rollbackCommand);

  return prog;
}

export type { PrepareOptions, PrepareResult } from './commands/prepare.js';
export { prepare } from './commands/prepare.js';
export { rollback } from './commands/rollback.js';
// Re-export shipit for testing
export { shipit } from './commands/shipit.js';
export type { ShipitOptions, ShipitResult } from './utils/types.js';
