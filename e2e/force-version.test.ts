import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shipit } from '../packages/cli/src/commands/shipit.js';
import ChangelogPlugin from '../packages/plugin-changelog/src/changelog.js';
import ConventionalPlugin from '../packages/plugin-conventional/src/conventional.js';
import GitPlugin from '../packages/plugin-git/src/git.js';
import { createMockCommit, createMockGitOperations } from './mock-operations.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('E2E: Force Version', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should force specific version', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('fix', 'small fix', ['src/index.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit('3.0.0', {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('3.0.0');
  });

  it('should force major bump', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('fix', 'small fix', ['src/index.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.5.3' }),
      },
      '/',
    );

    const result = await shipit('major', {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('2.0.0');
  });

  it('should force minor bump', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('fix', 'small fix', ['src/index.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.5.3' }),
      },
      '/',
    );

    const result = await shipit('minor', {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.6.0');
  });

  it('should force patch bump', async () => {
    const gitOps = createMockGitOperations({
      commits: [createMockCommit('feat', 'new feature', ['src/index.ts'])],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.5.3' }),
      },
      '/',
    );

    const result = await shipit('patch', {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.5.4');
  });
});
