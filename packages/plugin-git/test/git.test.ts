import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitPlugin from '../src/git.js';

// Mock execa
vi.mock('execa');
const mockedExeca = vi.mocked(execa);

describe('GitPlugin', () => {
  let plugin: GitPlugin;
  // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
  let mockBonvoy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    plugin = new GitPlugin();
    mockBonvoy = {
      hooks: {
        beforePublish: { tap: vi.fn() },
      },
    };
  });

  it('should register hooks', () => {
    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.beforePublish.tap).toHaveBeenCalledWith('git', expect.any(Function));
  });

  it('should commit changes with default message', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [
        { name: '@test/package-a', version: '1.0.0' },
        { name: '@test/package-b', version: '2.0.0' },
      ],
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('git', ['add', '.']);
    expect(mockedExeca).toHaveBeenCalledWith('git', [
      'commit',
      '-m',
      'chore: release @test/package-a, @test/package-b',
    ]);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['tag', '@test/package-a@1.0.0']);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['tag', '@test/package-b@2.0.0']);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['push']);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['push', 'origin', '@test/package-a@1.0.0']);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['push', 'origin', '@test/package-b@2.0.0']);
  });

  it('should use custom commit message', async () => {
    plugin = new GitPlugin({ commitMessage: 'release: {packages}' });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('git', ['commit', '-m', 'release: @test/package']);
  });

  it('should use custom tag format', async () => {
    plugin = new GitPlugin({ tagFormat: 'v{version}' });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('git', ['tag', 'v1.0.0']);
  });

  it('should push changes by default', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [
        { name: '@test/package-a', version: '1.0.0' },
        { name: '@test/package-b', version: '2.0.0' },
      ],
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('git', ['push']);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['push', 'origin', '@test/package-a@1.0.0']);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['push', 'origin', '@test/package-b@2.0.0']);
  });

  it('should not push when disabled', async () => {
    plugin = new GitPlugin({ push: false });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package-a', version: '1.0.0' }],
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).not.toHaveBeenCalledWith('git', ['push']);
  });

  it('should skip commit when no packages', async () => {
    plugin.apply(mockBonvoy);

    const context = { packages: [] };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).not.toHaveBeenCalledWith('git', ['add', '.']);
    expect(mockedExeca).not.toHaveBeenCalledWith('git', [
      'commit',
      expect.any(String),
      expect.any(String),
    ]);
  });

  it('should handle single package', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('git', [
      'commit',
      '-m',
      'chore: release @test/package',
    ]);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['tag', '@test/package@1.0.0']);
  });

  it('should skip push in dry-run mode', async () => {
    plugin = new GitPlugin({ push: true });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      isDryRun: true,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).not.toHaveBeenCalledWith('git', ['push']);
  });

  it('should skip commit in dry-run mode', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      isDryRun: true,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).not.toHaveBeenCalledWith('git', ['add', '.']);
    expect(mockedExeca).not.toHaveBeenCalledWith('git', ['commit', '-m', expect.any(String)]);
  });

  it('should skip tags in dry-run mode', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      isDryRun: true,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).not.toHaveBeenCalledWith('git', ['tag', expect.any(String)]);
  });

  it('should execute git operations when not in dry-run', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      isDryRun: false,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tap.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('git', ['add', '.']);
    expect(mockedExeca).toHaveBeenCalledWith('git', [
      'commit',
      '-m',
      'chore: release @test/package',
    ]);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['tag', '@test/package@1.0.0']);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['push']);
    expect(mockedExeca).toHaveBeenCalledWith('git', ['push', 'origin', '@test/package@1.0.0']);
  });
});
