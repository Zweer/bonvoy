#!/usr/bin/env npx tsx

/**
 * Script to publish dummy packages to npm for OIDC support.
 * OIDC (provenance) requires the package to already exist on npm.
 * This script creates minimal placeholder packages for first-time publish.
 *
 * Usage: npx tsx scripts/publish-dummy-packages.ts
 */

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootPath = process.cwd();

function checkNpmLogin(): boolean {
  try {
    const whoami = execSync('npm whoami', { encoding: 'utf-8' }).trim();
    console.log(`✅ Logged in as: ${whoami}`);
    return true;
  } catch {
    console.log('❌ Not logged in to npm');
    return false;
  }
}

function npmLogin(): boolean {
  console.log('🔐 Starting npm login...');
  try {
    execSync('npm login', { stdio: 'inherit' });
    return true;
  } catch {
    console.error('❌ npm login failed');
    return false;
  }
}

function packageExists(name: string): boolean {
  try {
    execSync(`npm view ${name} version`, { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function publishDummy(pkgPath: string, pkgJson: { name: string }): void {
  const { name } = pkgJson;

  if (packageExists(name)) {
    console.log(`⏭️  ${name} already exists on npm, skipping`);
    return;
  }

  console.log(`📦 Publishing dummy for ${name}...`);

  try {
    execSync('npm publish --access public', {
      cwd: pkgPath,
      stdio: 'inherit',
    });
    console.log(`✅ ${name} published successfully`);
  } catch (error) {
    console.error(`❌ Failed to publish ${name}: ${(error as Error).message}`);
  }
}

function main(): void {
  console.log('🚢 bonvoy dummy package publisher\n');

  if (!checkNpmLogin() && !npmLogin()) {
    process.exit(1);
  }

  console.log('');

  const packagesDir = join(rootPath, 'packages');
  const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(packagesDir, d.name));

  for (const pkgPath of packageDirs) {
    const pkgJsonPath = join(pkgPath, 'package.json');
    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      publishDummy(pkgPath, pkgJson);
    } catch {
      console.warn(`⚠️  Skipping ${pkgPath}: no valid package.json`);
    }
  }

  console.log('\n✨ Done!');
}

main();
