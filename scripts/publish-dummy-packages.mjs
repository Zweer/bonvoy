#!/usr/bin/env node

/**
 * Script to publish dummy packages to npm for OIDC support.
 * OIDC (provenance) requires the package to already exist on npm.
 * This script creates minimal placeholder packages for first-time publish.
 *
 * Usage: node scripts/publish-dummy-packages.mjs
 */

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootPath = process.cwd();

// Check if logged in to npm
function checkNpmLogin() {
  try {
    const whoami = execSync('npm whoami', { encoding: 'utf-8' }).trim();
    console.log(`✅ Logged in as: ${whoami}`);
    return true;
  } catch {
    console.log('❌ Not logged in to npm');
    return false;
  }
}

// Login to npm
function npmLogin() {
  console.log('🔐 Starting npm login...');
  try {
    execSync('npm login', { stdio: 'inherit' });
    return true;
  } catch {
    console.error('❌ npm login failed');
    return false;
  }
}

// Check if package exists on npm
function packageExists(name) {
  try {
    execSync(`npm view ${name} version`, { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Publish a dummy version of the package
function publishDummy(pkgPath, pkgJson) {
  const name = pkgJson.name;

  if (packageExists(name)) {
    console.log(`⏭️  ${name} already exists on npm, skipping`);
    return;
  }

  console.log(`📦 Publishing dummy for ${name}...`);

  try {
    // Publish with minimal content (just package.json)
    execSync('npm publish --access public', {
      cwd: pkgPath,
      stdio: 'inherit',
    });
    console.log(`✅ ${name} published successfully`);
  } catch (error) {
    console.error(`❌ Failed to publish ${name}: ${error.message}`);
  }
}

// Main
async function main() {
  console.log('🚢 bonvoy dummy package publisher\n');

  // 1. Check/ensure npm login
  if (!checkNpmLogin()) {
    if (!npmLogin()) {
      process.exit(1);
    }
  }

  console.log('');

  // 2. Find all packages
  const packagesDir = join(rootPath, 'packages');
  const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(packagesDir, d.name));

  // 3. Process each package
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
