import { execa } from 'execa';
import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockCommit, createMockExeca } from './helpers.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('execa');

describe('E2E: Breaking Changes', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it('should bump major version with feat! syntax', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([
      createMockCommit('feat', 'remove deprecated API', ['src/api.ts'], {
        breaking: true,
      }),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

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
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('2.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });

  it('should bump major version with fix! syntax', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([
      createMockCommit('fix', 'change default behavior', ['src/config.ts'], {
        breaking: true,
      }),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '0.5.0',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('1.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });

  it('should prioritize major over minor when both present', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([
      createMockCommit('feat', 'add new feature', ['src/feature.ts']),
      createMockCommit('feat', 'breaking change', ['src/api.ts'], { breaking: true }),
      createMockCommit('fix', 'fix bug', ['src/bug.ts']),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.2.3',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('2.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });

  it('should handle breaking changes in monorepo', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setNpmWorkspaces([
      { name: '@test/core', version: '1.0.0', location: 'packages/core' },
      { name: '@test/utils', version: '1.0.0', location: 'packages/utils' },
    ]);
    mockExeca.setGitCommits([
      createMockCommit('feat', 'breaking in core', ['packages/core/src/index.ts'], {
        breaking: true,
      }),
      createMockCommit('feat', 'normal feature in utils', ['packages/utils/src/index.ts']),
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
    expect(result.versions['@test/core']).toBe('2.0.0'); // major
    expect(result.versions['@test/utils']).toBe('1.1.0'); // minor
    expect(result.bumps['@test/core']).toBe('major');
    expect(result.bumps['@test/utils']).toBe('minor');
  });

  it('should handle 0.x.x versions with breaking changes', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([
      createMockCommit('feat', 'breaking change', ['src/index.ts'], { breaking: true }),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '0.2.5',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const { shipit } = await import('../packages/cli/src/commands/shipit.js');
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('1.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });
});
