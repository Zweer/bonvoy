import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NpmPlugin from '../src/npm.js';

// Mock execa
vi.mock('execa');
const mockedExeca = vi.mocked(execa);

// Mock console.log
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('NpmPlugin', () => {
  let plugin: NpmPlugin;
  // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
  let mockBonvoy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    plugin = new NpmPlugin();
    mockBonvoy = {
      hooks: {
        publish: { tap: vi.fn() },
      },
    };
  });

  it('should register hooks', () => {
    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.publish.tap).toHaveBeenCalledWith('npm', expect.any(Function));
  });

  it('should publish packages with default config', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [
        { name: '@test/package-a', version: '1.0.0', path: '/path/to/a' },
        { name: '@test/package-b', version: '2.0.0', path: '/path/to/b' },
      ],
    };

    // Mock npm view to return false (not published) - will be called for each package
    mockedExeca
      .mockRejectedValueOnce(new Error('Not found')) // First package check
      // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
      .mockResolvedValueOnce(undefined as any) // First package publish
      .mockRejectedValueOnce(new Error('Not found')) // Second package check
      // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
      .mockResolvedValueOnce(undefined as any); // Second package publish

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('npm', ['view', '@test/package-a@1.0.0', 'version'], {
      stdio: 'pipe',
    });
    expect(mockedExeca).toHaveBeenCalledWith(
      'npm',
      ['publish', '--access', 'public', '--provenance'],
      {
        cwd: '/path/to/a',
        stdio: 'inherit',
      },
    );
    expect(mockedExeca).toHaveBeenCalledWith('npm', ['view', '@test/package-b@2.0.0', 'version'], {
      stdio: 'pipe',
    });
    expect(mockedExeca).toHaveBeenCalledWith(
      'npm',
      ['publish', '--access', 'public', '--provenance'],
      {
        cwd: '/path/to/b',
        stdio: 'inherit',
      },
    );
  });

  it('should skip already published packages', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    // Mock npm view to return the version (already published)
    // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
    mockedExeca.mockResolvedValue({ stdout: '1.0.0' } as any);

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('npm', ['view', '@test/package@1.0.0', 'version'], {
      stdio: 'pipe',
    });
    expect(mockedExeca).not.toHaveBeenCalledWith('npm', expect.arrayContaining(['publish']));
    expect(consoleSpy).toHaveBeenCalledWith('Skipping @test/package@1.0.0 - already published');
  });

  it('should use dry-run mode', async () => {
    plugin = new NpmPlugin({ dryRun: true });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    mockedExeca
      .mockRejectedValueOnce(new Error('Not found')) // Package check
      // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
      .mockResolvedValueOnce(undefined as any); // Package publish

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith(
      'npm',
      ['publish', '--dry-run', '--access', 'public', '--provenance'],
      {
        cwd: '/path/to/pkg',
        stdio: 'inherit',
      },
    );
  });

  it('should use custom registry', async () => {
    plugin = new NpmPlugin({ registry: 'https://custom.registry.com' });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    mockedExeca
      .mockRejectedValueOnce(new Error('Not found')) // Package check
      // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
      .mockResolvedValueOnce(undefined as any); // Package publish

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith(
      'npm',
      [
        'publish',
        '--access',
        'public',
        '--provenance',
        '--registry',
        'https://custom.registry.com',
      ],
      {
        cwd: '/path/to/pkg',
        stdio: 'inherit',
      },
    );
  });

  it('should use restricted access', async () => {
    plugin = new NpmPlugin({ access: 'restricted' });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    mockedExeca
      .mockRejectedValueOnce(new Error('Not found')) // Package check
      // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
      .mockResolvedValueOnce(undefined as any); // Package publish

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith(
      'npm',
      ['publish', '--access', 'restricted', '--provenance'],
      {
        cwd: '/path/to/pkg',
        stdio: 'inherit',
      },
    );
  });

  it('should not skip existing when disabled', async () => {
    plugin = new NpmPlugin({ skipExisting: false });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    mockedExeca // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
      .mockResolvedValueOnce(undefined as any); // Package publish (no check)

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).not.toHaveBeenCalledWith(
      'npm',
      ['view', '@test/package@1.0.0', 'version'],
      { stdio: 'pipe' },
    );
    expect(mockedExeca).toHaveBeenCalledWith(
      'npm',
      ['publish', '--access', 'public', '--provenance'],
      {
        cwd: '/path/to/pkg',
        stdio: 'inherit',
      },
    );
  });

  it('should not add registry flag for default registry', async () => {
    plugin = new NpmPlugin({ registry: 'https://registry.npmjs.org' });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    mockedExeca
      .mockRejectedValueOnce(new Error('Not found')) // Package check
      // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
      .mockResolvedValueOnce(undefined as any); // Package publish

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith(
      'npm',
      ['publish', '--access', 'public', '--provenance'],
      {
        cwd: '/path/to/pkg',
        stdio: 'inherit',
      },
    );
  });

  it('should handle empty packages array', async () => {
    plugin.apply(mockBonvoy);

    const context = { packages: [] };

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).not.toHaveBeenCalled();
  });

  it('should not add provenance flag when disabled', async () => {
    plugin = new NpmPlugin({ provenance: false });
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    mockedExeca
      .mockRejectedValueOnce(new Error('Not found'))
      // biome-ignore lint/suspicious/noExplicitAny: Mock return value for testing
      .mockResolvedValueOnce(undefined as any);

    const publishFn = mockBonvoy.hooks.publish.tap.mock.calls[0][1];
    await publishFn(context);

    expect(mockedExeca).toHaveBeenCalledWith('npm', ['publish', '--access', 'public'], {
      cwd: '/path/to/pkg',
      stdio: 'inherit',
    });
  });
});
