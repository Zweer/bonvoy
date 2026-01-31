import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockCommit, createMockExeca } from './helpers.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('E2E: Force Version', () => {
  const mockExeca = createMockExeca();

  beforeEach(() => {
    vol.reset();
    mockExeca.reset();
  });

  it('should force specific version', async () => {
    mockExeca.setGitCommits([createMockCommit('feat', 'add feature', ['src/index.ts'])]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit('3.0.0', { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('3.0.0');
    expect(result.bumps['test-pkg']).toBe('3.0.0');
  });

  it('should force major bump', async () => {
    mockExeca.setGitCommits([createMockCommit('fix', 'small fix', ['src/index.ts'])]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.5.3',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit('major', { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('2.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });

  it('should force minor bump', async () => {
    mockExeca.setGitCommits([createMockCommit('fix', 'small fix', ['src/index.ts'])]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.5.3',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit('minor', { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('1.6.0');
    expect(result.bumps['test-pkg']).toBe('minor');
  });

  it('should force patch bump', async () => {
    mockExeca.setGitCommits([createMockCommit('feat', 'big feature', ['src/index.ts'])]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.5.3',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit('patch', { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('1.5.4');
    expect(result.bumps['test-pkg']).toBe('patch');
  });

  it('should force version in monorepo for all changed packages', async () => {
    mockExeca.setNpmWorkspaces([
      { name: '@test/core', version: '1.0.0', location: 'packages/core' },
      { name: '@test/utils', version: '1.0.0', location: 'packages/utils' },
      { name: '@test/cli', version: '1.0.0', location: 'packages/cli' },
    ]);
    mockExeca.setGitCommits([
      createMockCommit('feat', 'feature in core', ['packages/core/src/index.ts']),
      createMockCommit('fix', 'fix in utils', ['packages/utils/src/index.ts']),
    ]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit('major', { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(3);
    expect(result.versions['@test/core']).toBe('2.0.0');
    expect(result.versions['@test/utils']).toBe('2.0.0');
    expect(result.versions['@test/cli']).toBe('2.0.0');
    expect(result.bumps['@test/core']).toBe('major');
    expect(result.bumps['@test/utils']).toBe('major');
    expect(result.bumps['@test/cli']).toBe('major');
  });

  it('should force specific version in monorepo', async () => {
    mockExeca.setNpmWorkspaces([
      { name: '@test/core', version: '1.0.0', location: 'packages/core' },
      { name: '@test/utils', version: '1.0.0', location: 'packages/utils' },
    ]);
    mockExeca.setGitCommits([createMockCommit('feat', 'feature', ['packages/core/src/index.ts'])]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit('5.0.0', { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(2);
    expect(result.versions['@test/core']).toBe('5.0.0');
    expect(result.versions['@test/utils']).toBe('5.0.0');
  });

  it('should force bump type even without semantic commits', async () => {
    mockExeca.setGitCommits([createMockCommit('docs', 'update docs', ['README.md'])]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit('major', { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('2.0.0');
  });

  it('should force version even without semantic commits', async () => {
    mockExeca.setGitCommits([createMockCommit('docs', 'update docs', ['README.md'])]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit('2.0.0', { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('2.0.0');
  });

  it('should reject invalid semver versions', async () => {
    mockExeca.setGitCommits([createMockCommit('feat', 'add feature', ['src/index.ts'])]);
    mockExeca.setGitLastTag(null);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');

    await expect(shipit('banana', { dryRun: true, cwd: '/project' })).rejects.toThrow(
      'Invalid version "banana"',
    );
  });
});
