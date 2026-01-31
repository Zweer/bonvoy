import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shipit } from '../packages/cli/src/commands/shipit.js';
import ChangelogPlugin from '../packages/plugin-changelog/src/changelog.js';
import ConventionalPlugin from '../packages/plugin-conventional/src/conventional.js';
import GitPlugin from '../packages/plugin-git/src/git.js';
import { createMockCommit, createMockGitOperations } from './mock-operations.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('E2E: Single Package', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should bump minor version for feat commit', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('feat', 'add authentication', ['src/auth.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.1.0');
    expect(result.bumps['test-pkg']).toBe('minor');
  });

  it('should bump patch version for fix commit', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('fix', 'resolve bug', ['src/bug.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.0.1');
    expect(result.bumps['test-pkg']).toBe('patch');
  });

  it('should bump major version for breaking change', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('feat', 'breaking change', ['src/api.ts'], { breaking: true })],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
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

  it('should call git operations when not in dry-run', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('feat', 'add feature', ['src/feature.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    await shipit(undefined, {
      cwd: '/project',
      dryRun: false,
      gitOps,
      plugins: [
        new ConventionalPlugin(),
        new ChangelogPlugin(),
        new GitPlugin({ push: false }, gitOps),
      ],
    });

    // Verify git operations were called
    const methods = gitOps.calls.map((c) => c.method);
    expect(methods).toContain('add');
    expect(methods).toContain('commit');
    expect(methods).toContain('tag');
  });

  it('should not release when no semantic commits', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('chore', 'update deps', ['package.json'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.changedPackages).toHaveLength(0);
  });
});
