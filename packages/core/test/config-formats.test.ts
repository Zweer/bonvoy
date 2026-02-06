import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, 'fixtures', 'config-formats');

describe('config formats integration', () => {
  const expectedConfig = {
    versioning: 'independent',
    rootVersionStrategy: 'max',
    commitMessage: 'chore: release {packages}',
    tagFormat: '{name}@{version}',
    changelog: {
      global: false,
      sections: {
        feat: '✨ Features',
        fix: '🐛 Bug Fixes',
        perf: '⚡ Performance',
        docs: '📚 Documentation',
        breaking: '💥 Breaking Changes',
      },
    },
    workflow: 'direct',
    conventional: { preset: 'angular' },
    git: { push: true },
    npm: {
      registry: 'https://registry.npmjs.org',
      access: 'public',
      dryRun: false,
      skipExisting: true,
      provenance: true,
    },
    github: { draft: false },
    gitlab: {},
    baseBranch: 'main',
    plugins: [],
  };

  it('should load bonvoy.config.ts', async () => {
    const configPath = path.join(fixturesPath, 'bonvoy.config.ts');
    const config = await loadConfig(fixturesPath, configPath);

    expect(config.versioning).toBe('independent');
    expect(config.commitMessage).toBe('chore: release {packages}');
    expect(config.changelog?.sections?.feat).toBe('✨ Features');
    expect(config.changelog?.sections?.fix).toBe('🐛 Bug Fixes');
  });

  it('should load bonvoy.config.json', async () => {
    const configPath = path.join(fixturesPath, 'bonvoy.config.json');
    const config = await loadConfig(fixturesPath, configPath);

    expect(config.versioning).toBe('independent');
    expect(config.commitMessage).toBe('chore: release {packages}');
    expect(config.changelog?.sections?.feat).toBe('✨ Features');
    expect(config.changelog?.sections?.fix).toBe('🐛 Bug Fixes');
  });

  it('should load package.json with bonvoy config', async () => {
    const configPath = path.join(fixturesPath, 'package.json');
    const config = await loadConfig(fixturesPath, configPath);

    expect(config.versioning).toBe('independent');
    expect(config.commitMessage).toBe('chore: release {packages}');
    expect(config.changelog?.sections?.feat).toBe('✨ Features');
    expect(config.changelog?.sections?.fix).toBe('🐛 Bug Fixes');
  });

  it('should load custom config file', async () => {
    const configPath = path.join(fixturesPath, 'custom-config.json');
    const config = await loadConfig(fixturesPath, configPath);

    expect(config.versioning).toBe('fixed');
    expect(config.commitMessage).toBe('custom: release all packages');
    expect(config.tagFormat).toBe('v{version}');
    expect(config.changelog?.sections?.feat).toBe('🚀 New Features');
    expect(config.changelog?.sections?.fix).toBe('🔧 Fixes');
  });

  it('should auto-discover bonvoy.config.ts in directory', async () => {
    const tsOnlyPath = path.join(__dirname, 'fixtures', 'config-ts-only');
    const config = await loadConfig(tsOnlyPath);

    expect(config.versioning).toBe('independent');
    expect(config.commitMessage).toBe('chore: release {packages}');
    expect(config.changelog?.sections?.feat).toBe('✨ Features');
  });

  it('should auto-discover bonvoy.config.json in directory', async () => {
    const jsonOnlyPath = path.join(__dirname, 'fixtures', 'config-json-only');
    const config = await loadConfig(jsonOnlyPath);

    expect(config.versioning).toBe('independent');
    expect(config.commitMessage).toBe('chore: release {packages}');
    expect(config.changelog?.sections?.feat).toBe('✨ Features');
  });

  it('should auto-discover package.json bonvoy config in directory', async () => {
    const pkgOnlyPath = path.join(__dirname, 'fixtures', 'config-pkg-only');
    const config = await loadConfig(pkgOnlyPath);

    expect(config.versioning).toBe('independent');
    expect(config.commitMessage).toBe('chore: release {packages}');
    expect(config.changelog?.sections?.feat).toBe('✨ Features');
  });

  it('should return default config when no config exists', async () => {
    const emptyPath = path.join(__dirname, 'fixtures', 'empty');
    const config = await loadConfig(emptyPath);

    expect(config).toEqual(expectedConfig);
  });

  it('should handle invalid config file gracefully', async () => {
    const invalidPath = '/nonexistent/config.js';
    const config = await loadConfig(fixturesPath, invalidPath);

    expect(config).toEqual(expectedConfig);
  });

  it('should load .js config as ES module when package.json has type=module', async () => {
    const esmPath = path.join(__dirname, 'fixtures', 'config-esm');
    const configPath = path.join(esmPath, 'bonvoy.config.js');
    const config = await loadConfig(esmPath, configPath);

    expect(config.versioning).toBe('independent');
    expect(config.commitMessage).toBe('esm: release {packages}');
    expect(config.changelog?.sections?.feat).toBe('🚀 ESM Features');
    expect(config.changelog?.sections?.fix).toBe('🔧 ESM Fixes');
  });

  it('should load .js config as CommonJS when package.json has type=commonjs', async () => {
    const cjsPath = path.join(__dirname, 'fixtures', 'config-cjs');
    const configPath = path.join(cjsPath, 'bonvoy.config.js');
    const config = await loadConfig(cjsPath, configPath);

    expect(config.versioning).toBe('independent');
    expect(config.commitMessage).toBe('cjs: release {packages}');
    expect(config.changelog?.sections?.feat).toBe('📦 CJS Features');
    expect(config.changelog?.sections?.fix).toBe('🛠️ CJS Fixes');
  });

  it('should auto-discover ESM config in directory', async () => {
    const esmPath = path.join(__dirname, 'fixtures', 'config-esm');
    const config = await loadConfig(esmPath);

    expect(config.commitMessage).toBe('esm: release {packages}');
  });

  it('should auto-discover CommonJS config in directory', async () => {
    const cjsPath = path.join(__dirname, 'fixtures', 'config-cjs');
    const config = await loadConfig(cjsPath);

    expect(config.commitMessage).toBe('cjs: release {packages}');
  });
});
