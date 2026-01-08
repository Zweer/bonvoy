#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Bonvoy, loadConfig } from '@bonvoy/core';
import type { Command } from '@commander-js/extra-typings';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

async function shipit(bump?: string, options: { dryRun?: boolean; package?: string[] } = {}) {
  try {
    console.log('🚢 Starting bonvoy release...');
    console.log(`Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
    if (bump) console.log(`Bump: ${bump}`);
    if (options.package?.length) console.log(`Packages: ${options.package.join(', ')}`);

    // 1. Load configuration
    const config = await loadConfig();
    console.log('✅ Configuration loaded');

    // 2. Initialize Bonvoy with hooks
    const _bonvoy = new Bonvoy(config);
    console.log('✅ Hook system initialized');

    // 3. TODO: Load default plugins
    console.log('⏳ Loading plugins...');

    // 4. TODO: Detect workspace packages
    console.log('⏳ Detecting packages...');

    // 5. TODO: Analyze commits since last release
    console.log('⏳ Analyzing commits...');

    // 6. TODO: Determine version bumps
    console.log('⏳ Calculating versions...');

    // 7. TODO: Generate changelogs
    console.log('⏳ Generating changelogs...');

    // 8. TODO: Execute hooks (version, publish, release)
    console.log('⏳ Executing release...');

    if (options.dryRun) {
      console.log('🔍 Dry run completed - no changes made');
    } else {
      console.log('🎉 Release completed successfully!');
    }
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
