import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shipit } from '../packages/cli/src/commands/shipit.js';
import ChangelogPlugin from '../packages/plugin-changelog/src/changelog.js';
import ConventionalPlugin from '../packages/plugin-conventional/src/conventional.js';
import GitPlugin from '../packages/plugin-git/src/git.js';
import { createMockCommit, createMockGitOperations } from './mock-operations.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('E2E: Monorepo', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should bump only packages with changes', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        createMockCommit('feat', 'add feature to core', ['packages/core/src/index.ts']),
        createMockCommit('fix', 'fix utils bug', ['packages/utils/src/index.ts']),
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({
          name: 'monorepo',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/project/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/project/packages/utils/package.json': JSON.stringify({
          name: '@test/utils',
          version: '1.0.0',
        }),
        '/project/packages/cli/package.json': JSON.stringify({
          name: '@test/cli',
          version: '1.0.0',
        }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      packages: [
        { name: '@test/core', version: '1.0.0', path: '/project/packages/core' },
        { name: '@test/utils', version: '1.0.0', path: '/project/packages/utils' },
        { name: '@test/cli', version: '1.0.0', path: '/project/packages/cli' },
      ],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.changedPackages).toHaveLength(2);
    expect(result.versions['@test/core']).toBe('1.1.0');
    expect(result.versions['@test/utils']).toBe('1.0.1');
    expect(result.versions['@test/cli']).toBeUndefined();
  });

  it('should handle different bump types across packages', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        createMockCommit('feat', 'breaking change', ['packages/core/src/index.ts'], {
          breaking: true,
        }),
        createMockCommit('feat', 'add feature', ['packages/utils/src/index.ts']),
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({
          name: 'monorepo',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/project/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/project/packages/utils/package.json': JSON.stringify({
          name: '@test/utils',
          version: '1.0.0',
        }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      packages: [
        { name: '@test/core', version: '1.0.0', path: '/project/packages/core' },
        { name: '@test/utils', version: '1.0.0', path: '/project/packages/utils' },
      ],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['@test/core']).toBe('2.0.0');
    expect(result.bumps['@test/core']).toBe('major');
    expect(result.versions['@test/utils']).toBe('1.1.0');
    expect(result.bumps['@test/utils']).toBe('minor');
  });
});
