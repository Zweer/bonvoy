#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Command } from '@commander-js/extra-typings';

import { changelogCommand } from './commands/changelog.js';
import { prepareCommand } from './commands/prepare.js';
import { shipitCommand } from './commands/shipit.js';
import { statusCommand } from './commands/status.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createProgram(): Command {
  const { Command } = require('commander');
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
    .argument('[bump]', 'Version bump (patch/minor/major/x.y.z)')
    .action(shipitCommand);

  prog.command('prepare').description('Create release PR').action(prepareCommand);

  prog.command('status').description('Show pending changes').action(statusCommand);

  prog.command('changelog').description('Preview changelog').action(changelogCommand);

  return prog;
}

// Re-export shipit for testing
export { shipit } from './commands/shipit.js';
export type { ShipitOptions, ShipitResult } from './utils/types.js';
