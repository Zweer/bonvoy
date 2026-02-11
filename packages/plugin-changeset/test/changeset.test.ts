import { describe, expect, it, vi } from 'vitest';

import ChangesetPlugin from '../src/changeset.js';
import type { ChangesetOperations } from '../src/operations.js';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  level: 'silent' as const,
};

function createMockOps(
  files: Record<string, string> = {},
): ChangesetOperations & { deleted: string[] } {
  const deleted: string[] = [];
  return {
    deleted,
    readDir(dir: string): string[] {
      return Object.keys(files)
        .filter((f) => f.startsWith(dir))
        .map((f) => f.split('/').pop() ?? '');
    },
    readFile(path: string): string {
      return files[path] || '';
    },
    removeFile(path: string): void {
      deleted.push(path);
    },
    exists(path: string): boolean {
      return Object.keys(files).some((f) => f.startsWith(path));
    },
  };
}

describe('ChangesetPlugin', () => {
  it('should have correct name', () => {
    const plugin = new ChangesetPlugin();
    expect(plugin.name).toBe('changeset');
  });

  it('should throw if conventional plugin is already registered', () => {
    const plugin = new ChangesetPlugin();
    const mockBonvoy = {
      plugins: [{ name: 'conventional' }],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    expect(() => plugin.apply(mockBonvoy)).toThrow(
      'plugin-changeset and plugin-conventional cannot be used together',
    );
  });

  it('should read changeset files on beforeShipIt', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Added feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    expect(mockLogger.info).toHaveBeenCalledWith('📦 Found 1 changeset file(s)');
  });

  it('should return bump from getVersion', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Added feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    // Initialize by calling beforeShipIt
    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    // Test getVersion
    const getVersionFn = mockBonvoy.hooks.getVersion.tap.mock.calls[0][1];
    const bump = getVersionFn({ currentPackage: { name: '@scope/core' } });

    expect(bump).toBe('minor');
  });

  it('should return explicit version from getVersion', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/breaking.md': `---
"@scope/core": "2.0.0"
---
Breaking change`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const getVersionFn = mockBonvoy.hooks.getVersion.tap.mock.calls[0][1];
    const version = getVersionFn({ currentPackage: { name: '@scope/core' } });

    expect(version).toBe('2.0.0');
  });

  it('should return none for unknown package', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const getVersionFn = mockBonvoy.hooks.getVersion.tap.mock.calls[0][1];
    const bump = getVersionFn({ currentPackage: { name: '@scope/unknown' } });

    expect(bump).toBe('none');
  });

  it('should return changelog notes', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Added awesome feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const generateChangelogFn = mockBonvoy.hooks.generateChangelog.tap.mock.calls[0][1];
    const notes = generateChangelogFn({ currentPackage: { name: '@scope/core' } });

    expect(notes).toBe('Added awesome feature');
  });

  it('should concatenate notes from multiple files', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/a.md': `---
"@scope/core": minor
---
Feature A`,
      '/test/.changeset/b.md': `---
"@scope/core": patch
---
Fix B`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const generateChangelogFn = mockBonvoy.hooks.generateChangelog.tap.mock.calls[0][1];
    const notes = generateChangelogFn({ currentPackage: { name: '@scope/core' } });

    expect(notes).toBe('Feature A\n\nFix B');
  });

  it('should delete files after release', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const afterReleaseFn = mockBonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await afterReleaseFn({ isDryRun: false, logger: mockLogger });

    expect(mockOps.deleted).toContain('/test/.changeset/feature.md');
  });

  it('should not delete files in dry-run', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const afterReleaseFn = mockBonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await afterReleaseFn({ isDryRun: true, logger: mockLogger });

    expect(mockOps.deleted).toEqual([]);
  });

  it('should not delete files when disabled', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Feature`,
    });
    const plugin = new ChangesetPlugin({ deleteAfterRelease: false }, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const afterReleaseFn = mockBonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await afterReleaseFn({ isDryRun: false, logger: mockLogger });

    expect(mockOps.deleted).toEqual([]);
  });

  it('should read from .bonvoy directory too', async () => {
    const mockOps = createMockOps({
      '/test/.bonvoy/feature.md': `---
"@scope/core": minor
---
Feature from bonvoy dir`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const getVersionFn = mockBonvoy.hooks.getVersion.tap.mock.calls[0][1];
    const bump = getVersionFn({ currentPackage: { name: '@scope/core' } });

    expect(bump).toBe('minor');
  });

  it('should handle no changeset files', async () => {
    const mockOps = createMockOps({});
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    expect(mockLogger.info).toHaveBeenCalledWith('📦 No changeset files found');
  });

  it('should return none when no currentPackage', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const getVersionFn = mockBonvoy.hooks.getVersion.tap.mock.calls[0][1];
    const bump = getVersionFn({});

    expect(bump).toBe('none');
  });

  it('should return empty string for changelog when no currentPackage', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const generateChangelogFn = mockBonvoy.hooks.generateChangelog.tap.mock.calls[0][1];
    const notes = generateChangelogFn({});

    expect(notes).toBe('');
  });

  it('should return empty string for changelog when unknown package', async () => {
    const mockOps = createMockOps({
      '/test/.changeset/feature.md': `---
"@scope/core": minor
---
Feature`,
    });
    const plugin = new ChangesetPlugin({}, mockOps);

    const mockBonvoy = {
      plugins: [],
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        getVersion: { tap: vi.fn() },
        generateChangelog: { tap: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const beforeShipItFn = mockBonvoy.hooks.beforeShipIt.tapPromise.mock.calls[0][1];
    await beforeShipItFn({ rootPath: '/test', logger: mockLogger });

    const generateChangelogFn = mockBonvoy.hooks.generateChangelog.tap.mock.calls[0][1];
    const notes = generateChangelogFn({ currentPackage: { name: '@scope/unknown' } });

    expect(notes).toBe('');
  });
});
