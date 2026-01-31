import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shipit } from '../packages/cli/src/commands/shipit.js';
import ChangelogPlugin from '../packages/plugin-changelog/src/changelog.js';
import ConventionalPlugin from '../packages/plugin-conventional/src/conventional.js';
import GitPlugin from '../packages/plugin-git/src/git.js';
import { createMockCommit, createMockGitOperations } from './mock-operations.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('E2E: Breaking Changes', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should bump major version with feat! syntax', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        createMockCommit('feat', 'remove deprecated API', ['src/api.ts'], { breaking: true }),
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.5.3' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('2.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });

  it('should prioritize major over minor when both present', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        createMockCommit('feat', 'add feature', ['src/feature.ts']),
        createMockCommit('feat', 'breaking', ['src/api.ts'], { breaking: true }),
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.2.3' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('2.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });
});
