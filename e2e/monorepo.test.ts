import { execa } from 'execa';
import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockCommit, createMockExeca } from './helpers.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('execa');

describe('E2E: Monorepo', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it('should bump only packages with changes', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setNpmWorkspaces([
      { name: '@test/core', version: '1.0.0', location: 'packages/core' },
      { name: '@test/utils', version: '1.0.0', location: 'packages/utils' },
      { name: '@test/cli', version: '1.0.0', location: 'packages/cli' },
    ]);
    mockExeca.setGitCommits([
      createMockCommit('feat', 'add auth', ['packages/core/src/auth.ts']),
      createMockCommit('fix', 'fix bug', ['packages/utils/src/index.ts']),
      createMockCommit('docs', 'update docs', ['README.md']),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'monorepo',
          version: '1.0.0',
          workspaces: ['packages/*'],
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(2);
    expect(result.versions['@test/core']).toBe('1.1.0');
    expect(result.versions['@test/utils']).toBe('1.0.1');
    expect(result.versions['@test/cli']).toBeUndefined();
  });

  it('should handle cross-package dependencies', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setNpmWorkspaces([
      { name: '@test/core', version: '1.0.0', location: 'packages/core' },
      {
        name: '@test/cli',
        version: '1.0.0',
        location: 'packages/cli',
        dependencies: { '@test/core': '^1.0.0' },
      },
    ]);
    mockExeca.setGitCommits([
      createMockCommit('feat', 'add feature', ['packages/core/src/index.ts']),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

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
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['@test/core']).toBe('1.1.0');
    expect(result.versions['@test/cli']).toBeUndefined();
  });

  it('should assign commits to multiple packages when files span packages', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setNpmWorkspaces([
      { name: '@test/core', version: '1.0.0', location: 'packages/core' },
      { name: '@test/utils', version: '1.0.0', location: 'packages/utils' },
    ]);
    mockExeca.setGitCommits([
      createMockCommit('feat', 'shared feature', [
        'packages/core/src/shared.ts',
        'packages/utils/src/shared.ts',
      ]),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

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
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(2);
    expect(result.versions['@test/core']).toBe('1.1.0');
    expect(result.versions['@test/utils']).toBe('1.1.0');
  });

  it('should handle monorepo with no changes', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setNpmWorkspaces([
      { name: '@test/core', version: '1.0.0', location: 'packages/core' },
      { name: '@test/utils', version: '1.0.0', location: 'packages/utils' },
    ]);
    mockExeca.setGitCommits([
      createMockCommit('docs', 'update README', ['README.md']),
      createMockCommit('chore', 'update deps', ['package.json']),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

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
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(0);
    expect(result.versions).toEqual({});
  });

  it('should handle different bump types across packages', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setNpmWorkspaces([
      { name: '@test/core', version: '1.0.0', location: 'packages/core' },
      { name: '@test/utils', version: '1.0.0', location: 'packages/utils' },
      { name: '@test/cli', version: '1.0.0', location: 'packages/cli' },
    ]);
    mockExeca.setGitCommits([
      createMockCommit('feat', 'major feature', ['packages/core/src/index.ts'], {
        breaking: true,
      }),
      createMockCommit('feat', 'minor feature', ['packages/utils/src/index.ts']),
      createMockCommit('fix', 'patch fix', ['packages/cli/src/index.ts']),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

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
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(3);
    expect(result.versions['@test/core']).toBe('2.0.0');
    expect(result.versions['@test/utils']).toBe('1.1.0');
    expect(result.versions['@test/cli']).toBe('1.0.1');
    expect(result.bumps['@test/core']).toBe('major');
    expect(result.bumps['@test/utils']).toBe('minor');
    expect(result.bumps['@test/cli']).toBe('patch');
  });
});
