import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChangelogPlugin from '../../plugin-changelog/src/changelog.js';
import ConventionalPlugin from '../../plugin-conventional/src/conventional.js';
import GitPlugin from '../../plugin-git/src/git.js';
import type { GitOperations } from '../../plugin-git/src/operations.js';
import { shipit, shipitCommand } from '../src/commands/shipit.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '' }),
}));

function createMockGitOps(config: {
  commits?: Array<{ hash: string; message: string; author: string; date: string; files: string[] }>;
  lastTag?: string | null;
  currentBranch?: string;
  existingTags?: string[];
}): GitOperations {
  const existingTags = new Set(config.existingTags ?? []);
  return {
    async add() {},
    async commit() {},
    async tag() {},
    async push() {},
    async pushTags() {},
    async checkout() {},
    async getCurrentBranch() {
      return config.currentBranch ?? 'feature-branch';
    },
    async tagExists(name) {
      return existingTags.has(name);
    },
    async getLastTag() {
      return config.lastTag ?? null;
    },
    async getCommitsSinceTag() {
      return config.commits ?? [];
    },
  };
}

describe('shipit command', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should handle workspace with changes', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.packages).toHaveLength(1);
    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('1.1.0');
  });

  it('should handle no changes', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'chore: update deps',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['package.json'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.changedPackages).toHaveLength(0);
  });

  it('should write changelog when not in dry-run', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [
        new ConventionalPlugin(),
        new ChangelogPlugin(),
        new GitPlugin({ push: false }, gitOps),
      ],
    });

    // Verify version was bumped
    expect(result.versions['test-pkg']).toBe('1.1.0');

    // Verify package.json was updated
    const pkgJson = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(pkgJson.version).toBe('1.1.0');
  });

  it('should throw on invalid version', async () => {
    const gitOps = createMockGitOps({ commits: [], lastTag: null });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    await expect(
      shipit('invalid-version', {
        dryRun: true,
        cwd: '/test',
        gitOps,
        plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
      }),
    ).rejects.toThrow('Invalid version "invalid-version"');
  });

  it('should handle invalid package version gracefully', async () => {
    const gitOps = createMockGitOps({ commits: [], lastTag: null });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: 'invalid' }),
      },
      '/',
    );

    const result = await shipit('patch', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // When inc() returns null due to invalid version, it falls back to pkg.version
    expect(result.versions['test-pkg']).toBe('invalid');
  });

  it('should accept explicit valid version', async () => {
    const gitOps = createMockGitOps({ commits: [], lastTag: null });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit('2.0.0', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('2.0.0');
  });

  it('should write global changelog when enabled', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      silent: true,
      gitOps,
      config: { changelog: { global: true } },
      plugins: [
        new ConventionalPlugin(),
        new ChangelogPlugin({ global: true }),
        new GitPlugin({ push: false }, gitOps),
      ],
    });

    expect(vol.existsSync('/test/CHANGELOG.md')).toBe(true);
  });

  it('should suppress output in silent mode', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await shipit(undefined, {
      dryRun: true,
      silent: true,
      cwd: '/test',
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // In silent mode, shipit should not log anything
    const shipitLogs = consoleSpy.mock.calls.filter(
      (call) => call[0]?.includes?.('📦') || call[0]?.includes?.('🔍 Dry run'),
    );
    expect(shipitLogs).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});

describe('shipitCommand', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should output JSON when --json flag is set', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await shipitCommand(undefined, { dryRun: true, json: true, silent: true });

    const jsonCall = consoleSpy.mock.calls.find((call) => {
      try {
        JSON.parse(call[0]);
        return true;
      } catch {
        return false;
      }
    });

    expect(jsonCall).toBeDefined();
    const output = JSON.parse(jsonCall?.[0] as string);
    expect(output.success).toBe(true);
    expect(output.dryRun).toBe(true);

    consoleSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should output JSON with released packages', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    // Use shipit directly with mocked plugins to test JSON output structure
    const result = await shipit('patch', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // Verify the result structure that would be used for JSON output
    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('1.0.1');
  });

  it('should output JSON error on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    vol.fromJSON({}, '/');

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/nonexistent');

    await shipitCommand(undefined, { json: true, silent: true });

    const jsonCall = consoleSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(call[0]);
        return parsed.success === false;
      } catch {
        return false;
      }
    });

    expect(jsonCall).toBeDefined();
    const output = JSON.parse(jsonCall?.[0] as string);
    expect(output.success).toBe(false);
    expect(output.error).toBeDefined();
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should output error message on failure without --json', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Create empty filesystem - no package.json
    vol.fromJSON({}, '/');

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await shipitCommand(undefined, { silent: true });

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should log startup messages without --json', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await shipitCommand(undefined, { dryRun: true, silent: true });

    cwdSpy.mockRestore();
  });

  it('should detect publish-only mode when on main with tracking file', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.1.0' }),
        '/test/CHANGELOG.md': '# Changelog\n\n## 1.1.0\n\n- feat: new feature',
        '/test/.bonvoy/release-pr.json': JSON.stringify({
          prNumber: 42,
          prUrl: 'https://github.com/test/repo/pull/42',
          branch: 'release/1234567890',
          baseBranch: 'main',
          createdAt: '2024-01-01T00:00:00Z',
          packages: ['test-pkg'],
        }),
      },
      '/',
    );

    const gitOps = createMockGitOps({
      commits: [],
      lastTag: null,
      currentBranch: 'main', // On main branch
    });

    const result = await shipit(undefined, {
      cwd: '/test',
      silent: true,
      gitOps,
      dryRun: true,
    });

    // Should be in publish-only mode
    expect(result.changedPackages).toHaveLength(1);
    expect(result.changedPackages[0].name).toBe('test-pkg');
    expect(result.bumps['test-pkg']).toBe('from-pr');
  });

  it('should use normal flow when on non-main branch', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: new feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
      currentBranch: 'feature-branch', // Not on main
    });

    const result = await shipit(undefined, {
      cwd: '/test',
      silent: true,
      gitOps,
      dryRun: true,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin()],
    });

    // Should use normal flow
    expect(result.changedPackages).toHaveLength(1);
    expect(result.bumps['test-pkg']).toBe('minor');
  });

  it('should update internal dependencies when releasing packages', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts', 'packages/cli/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/test/packages/cli/package.json': JSON.stringify({
          name: '@test/cli',
          version: '1.0.0',
          dependencies: {
            '@test/core': '^1.0.0',
          },
        }),
      },
      '/',
    );

    const packages = [
      { name: '@test/core', version: '1.0.0', path: '/test/packages/core' },
      { name: '@test/cli', version: '1.0.0', path: '/test/packages/cli' },
    ];

    await shipit('minor', {
      dryRun: false,
      cwd: '/test',
      silent: true,
      gitOps,
      packages,
      plugins: [
        new ConventionalPlugin(),
        new ChangelogPlugin(),
        new GitPlugin({ push: false }, gitOps),
      ],
    });

    // Verify internal dependency was updated to new version
    const cliPkgJson = JSON.parse(
      vol.readFileSync('/test/packages/cli/package.json', 'utf-8') as string,
    );
    // core was bumped to 1.1.0, so cli's dependency should be updated
    expect(cliPkgJson.dependencies['@test/core']).toBe('^1.1.0');
  });

  it('should not update internal dependency if package is not being released', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/cli/src/index.ts'], // Only cli changes, not core
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/test/packages/cli/package.json': JSON.stringify({
          name: '@test/cli',
          version: '1.0.0',
          dependencies: {
            '@test/core': '^1.0.0',
          },
        }),
      },
      '/',
    );

    const packages = [
      { name: '@test/core', version: '1.0.0', path: '/test/packages/core' },
      { name: '@test/cli', version: '1.0.0', path: '/test/packages/cli' },
    ];

    // Don't force bump - let conventional commits determine which packages to release
    await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      silent: true,
      gitOps,
      packages,
      plugins: [
        new ConventionalPlugin(),
        new ChangelogPlugin(),
        new GitPlugin({ push: false }, gitOps),
      ],
    });

    // core was NOT bumped (no commits touched it), so cli's dependency should remain unchanged
    const cliPkgJson = JSON.parse(
      vol.readFileSync('/test/packages/cli/package.json', 'utf-8') as string,
    );
    expect(cliPkgJson.dependencies['@test/core']).toBe('^1.0.0');
  });

  it('should call beforeShipIt hook', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const beforeShipItCalls: unknown[] = [];
    const mockPlugin = {
      name: 'test-before-shipit',
      apply(bonvoy: import('@bonvoy/core').Bonvoy) {
        bonvoy.hooks.beforeShipIt.tap('test-before-shipit', (ctx) => {
          beforeShipItCalls.push(ctx);
        });
      },
    };

    await shipit(undefined, {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), mockPlugin],
    });

    expect(beforeShipItCalls).toHaveLength(1);
  });

  it('should filter packages with --package option', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts', 'packages/cli/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/test/packages/cli/package.json': JSON.stringify({
          name: '@test/cli',
          version: '1.0.0',
        }),
      },
      '/',
    );

    const packages = [
      { name: '@test/core', version: '1.0.0', path: '/test/packages/core' },
      { name: '@test/cli', version: '1.0.0', path: '/test/packages/cli' },
    ];

    const result = await shipit('minor', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      packages,
      package: ['@test/core'],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin()],
    });

    // Only @test/core should be released
    expect(result.changedPackages).toHaveLength(1);
    expect(result.changedPackages[0].name).toBe('@test/core');
    expect(result.versions['@test/cli']).toBeUndefined();
  });

  it('should generate changelog content via plugin', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add awesome feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin()],
    });

    // Changelog should contain the commit message
    expect(result.changelogs['test-pkg']).toContain('add awesome feature');
  });

  it('should write changelog files via plugin when not dry-run', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [
        new ConventionalPlugin(),
        new ChangelogPlugin(),
        new GitPlugin({ push: false }, gitOps),
      ],
    });

    // Changelog should be written by the plugin
    const changelog = vol.readFileSync('/test/CHANGELOG.md', 'utf-8') as string;
    expect(changelog).toContain('add feature');
    expect(changelog).toContain('Changelog');
  });
});

describe('fixed versioning', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should apply same version to all packages when versioning is fixed', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: core feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
        {
          hash: 'a2',
          message: 'fix: utils bug',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/utils/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '0.0.0',
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/test/packages/utils/package.json': JSON.stringify({
          name: '@test/utils',
          version: '1.0.0',
        }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      config: { versioning: 'fixed' },
      packages: [
        { name: '@test/core', version: '1.0.0', path: '/test/packages/core' },
        { name: '@test/utils', version: '1.0.0', path: '/test/packages/utils' },
      ],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // Both packages should have the same version (minor wins over patch)
    expect(result.changedPackages).toHaveLength(2);
    expect(result.versions['@test/core']).toBe('1.1.0');
    expect(result.versions['@test/utils']).toBe('1.1.0');
  });
});

describe('rootVersionStrategy', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should bump root package with max strategy', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '0.0.0',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
      },
      '/',
    );

    await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      silent: true,
      gitOps,
      config: { rootVersionStrategy: 'max' },
      packages: [{ name: '@test/core', version: '1.0.0', path: '/test/packages/core' }],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    const rootPkg = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(rootPkg.version).toBe('1.1.0');
  });

  it('should bump root package with patch strategy', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '1.0.0',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
      },
      '/',
    );

    await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      silent: true,
      gitOps,
      config: { rootVersionStrategy: 'patch' },
      packages: [{ name: '@test/core', version: '1.0.0', path: '/test/packages/core' }],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    const rootPkg = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(rootPkg.version).toBe('1.0.1');
  });

  it('should not bump root package with none strategy', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '0.0.0',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
      },
      '/',
    );

    await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      silent: true,
      gitOps,
      config: { rootVersionStrategy: 'none' },
      packages: [{ name: '@test/core', version: '1.0.0', path: '/test/packages/core' }],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    const rootPkg = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(rootPkg.version).toBe('0.0.0');
  });
});

describe('fixed versioning - explicit version', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should use explicit version in fixed mode', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '0.0.0',
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/test/packages/utils/package.json': JSON.stringify({
          name: '@test/utils',
          version: '1.0.0',
        }),
      },
      '/',
    );

    const result = await shipit('3.0.0', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      config: { versioning: 'fixed' },
      packages: [
        { name: '@test/core', version: '1.0.0', path: '/test/packages/core' },
        { name: '@test/utils', version: '1.0.0', path: '/test/packages/utils' },
      ],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['@test/core']).toBe('3.0.0');
    expect(result.versions['@test/utils']).toBe('3.0.0');
  });

  it('should create prerelease version with preid', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
      '/',
    );

    const result = await shipit('prerelease', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      preid: 'beta',
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.0.1-beta.0');
    expect(result.bumps['test-pkg']).toBe('prerelease');
  });

  it('should create prerelease version without preid', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
      '/',
    );

    const result = await shipit('prerelease', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      // no preid
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.0.1-0');
  });

  it('should increment existing prerelease version', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.1-beta.0' }) },
      '/',
    );

    const result = await shipit('prerelease', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      preid: 'beta',
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.0.1-beta.1');
  });

  it('should graduate prerelease to stable with patch bump', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'fix: bug fix',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.1-beta.3' }) },
      '/',
    );

    const result = await shipit('patch', {
      dryRun: true,
      cwd: '/test',
      silent: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // semver.inc('1.0.1-beta.3', 'patch') → '1.0.1' (graduates to stable)
    expect(result.versions['test-pkg']).toBe('1.0.1');
  });
});
