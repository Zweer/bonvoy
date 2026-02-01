import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shipit } from '../packages/cli/src/commands/shipit.js';
import ChangelogPlugin from '../packages/plugin-changelog/src/changelog.js';
import ConventionalPlugin from '../packages/plugin-conventional/src/conventional.js';
import GitPlugin from '../packages/plugin-git/src/git.js';
import { createMockCommit, createMockGitOperations } from './mock-operations.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('E2E: Pre-1.0 Versioning', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should bump patch for fix commit on pre-1.0 version', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('fix', 'resolve bug', ['src/bug.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '0.5.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('0.5.1');
    expect(result.bumps['test-pkg']).toBe('patch');
  });

  it('should bump minor for feat commit on pre-1.0 version', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('feat', 'add feature', ['src/feature.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '0.5.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('0.6.0');
    expect(result.bumps['test-pkg']).toBe('minor');
  });

  it('should bump patch for perf commit on pre-1.0 version', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('perf', 'optimize queries', ['src/db.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '0.5.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('0.5.1');
    expect(result.bumps['test-pkg']).toBe('patch');
  });
});
