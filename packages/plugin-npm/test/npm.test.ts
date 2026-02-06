import { beforeEach, describe, expect, it, vi } from 'vitest';

import NpmPlugin from '../src/npm.js';
import type { NpmOperations } from '../src/operations.js';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function createMockOps(
  config: { existingPackages?: string[]; hasToken?: boolean } = {},
): NpmOperations & {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  calls: Array<{ method: string; args: any[] }>;
  publishedVersions: Map<string, string>;
} {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  const calls: Array<{ method: string; args: any[] }> = [];
  const publishedVersions = new Map<string, string>();
  const existingPackages = new Set(config.existingPackages ?? []);
  const hasTokenValue = config.hasToken ?? true;
  return {
    calls,
    publishedVersions,
    async publish(args, cwd) {
      calls.push({ method: 'publish', args: [args, cwd] });
    },
    async view(pkg, version) {
      calls.push({ method: 'view', args: [pkg, version] });
      return publishedVersions.get(`${pkg}@${version}`) ?? null;
    },
    async packageExists(pkg) {
      calls.push({ method: 'packageExists', args: [pkg] });
      return existingPackages.has(pkg);
    },
    async hasToken() {
      calls.push({ method: 'hasToken', args: [] });
      return hasTokenValue;
    },
  };
}

describe('NpmPlugin', () => {
  let mockOps: ReturnType<typeof createMockOps>;
  let plugin: NpmPlugin;
  // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
  let mockBonvoy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOps = createMockOps();
    plugin = new NpmPlugin({}, mockOps);
    mockBonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        publish: { tapPromise: vi.fn() },
      },
    };
  });

  it('should register hooks', () => {
    plugin.apply(mockBonvoy);
    expect(mockBonvoy.hooks.validateRepo.tapPromise).toHaveBeenCalledWith(
      'npm',
      expect.any(Function),
    );
    expect(mockBonvoy.hooks.publish.tapPromise).toHaveBeenCalledWith('npm', expect.any(Function));
  });

  it('should skip publish in dry-run mode', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
      isDryRun: true,
      logger: mockLogger,
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    expect(mockOps.calls.filter((c) => c.method === 'publish')).toHaveLength(0);
  });

  it('should publish packages with default config', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      isDryRun: false,
      logger: mockLogger,
      packages: [
        { name: '@test/package-a', version: '1.0.0', path: '/path/to/a' },
        { name: '@test/package-b', version: '2.0.0', path: '/path/to/b' },
      ],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    // Should check if already published
    expect(mockOps.calls).toContainEqual({ method: 'view', args: ['@test/package-a', '1.0.0'] });
    expect(mockOps.calls).toContainEqual({ method: 'view', args: ['@test/package-b', '2.0.0'] });

    // Should publish both packages
    expect(mockOps.calls.filter((c) => c.method === 'publish')).toHaveLength(2);
  });

  it('should skip already published packages', async () => {
    mockOps.publishedVersions.set('@test/package-a@1.0.0', '1.0.0');
    plugin.apply(mockBonvoy);

    const context = {
      isDryRun: false,
      logger: mockLogger,
      packages: [
        { name: '@test/package-a', version: '1.0.0', path: '/path/to/a' },
        { name: '@test/package-b', version: '2.0.0', path: '/path/to/b' },
      ],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    // Should only publish package-b
    const publishCalls = mockOps.calls.filter((c) => c.method === 'publish');
    expect(publishCalls).toHaveLength(1);
    expect(publishCalls[0].args[1]).toBe('/path/to/b');
  });

  it('should use custom registry', async () => {
    plugin = new NpmPlugin({ registry: 'https://custom.registry.com' }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      isDryRun: false,
      logger: mockLogger,
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).toContain('--registry');
    expect(publishCall?.args[0]).toContain('https://custom.registry.com');
  });

  it('should use dry-run when configured', async () => {
    plugin = new NpmPlugin({ dryRun: true }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      isDryRun: false,
      logger: mockLogger,
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).toContain('--dry-run');
  });

  it('should set access level', async () => {
    plugin = new NpmPlugin({ access: 'restricted' }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      isDryRun: false,
      logger: mockLogger,
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).toContain('--access');
    expect(publishCall?.args[0]).toContain('restricted');
  });

  it('should use default operations when none provided', () => {
    const pluginWithDefaults = new NpmPlugin();
    expect(pluginWithDefaults.name).toBe('npm');
  });

  it('should skip provenance when disabled', async () => {
    plugin = new NpmPlugin({ provenance: false }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      isDryRun: false,
      logger: mockLogger,
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).not.toContain('--provenance');
  });

  it('should throw error when npm version already published', async () => {
    mockOps.publishedVersions.set('@test/package@1.0.0', '1.0.0');
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [{ name: '@test/package', version: '0.9.0', path: '/path/to/pkg' }],
      versions: { '@test/package': '1.0.0' },
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).rejects.toThrow('npm versions already exist');
  });

  it('should throw error when first publish without token', async () => {
    const opsNoToken = createMockOps({ existingPackages: [], hasToken: false });
    plugin = new NpmPlugin({ provenance: true }, opsNoToken);
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [{ name: '@test/new-package', version: '0.0.0', path: '/path/to/pkg' }],
      versions: { '@test/new-package': '1.0.0' },
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).rejects.toThrow('First publish requires NPM_TOKEN');
  });

  it('should pass validation when package exists and no token', async () => {
    const opsNoToken = createMockOps({ existingPackages: ['@test/package'], hasToken: false });
    plugin = new NpmPlugin({ provenance: true }, opsNoToken);
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [{ name: '@test/package', version: '0.9.0', path: '/path/to/pkg' }],
      versions: { '@test/package': '1.0.0' },
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).resolves.toBeUndefined();
  });

  it('should skip validation when no versions provided', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [{ name: '@test/package', version: '0.9.0', path: '/path/to/pkg' }],
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).resolves.toBeUndefined();
  });

  it('should skip package version check when version not in versions map', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [
        { name: '@test/package-a', version: '0.9.0', path: '/path/to/pkg-a' },
        { name: '@test/package-b', version: '0.9.0', path: '/path/to/pkg-b' },
      ],
      versions: { '@test/package-a': '1.0.0' }, // package-b not in versions
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).resolves.toBeUndefined();
  });

  it('should skip OIDC check when provenance is disabled', async () => {
    const opsNoToken = createMockOps({ existingPackages: [], hasToken: false });
    plugin = new NpmPlugin({ provenance: false }, opsNoToken);
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [{ name: '@test/new-package', version: '0.0.0', path: '/path/to/pkg' }],
      versions: { '@test/new-package': '1.0.0' },
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).resolves.toBeUndefined();
  });

  it('should use preid as npm tag for prereleases', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.1-beta.0', path: '/path/to/pkg' }],
      isDryRun: false,
      logger: mockLogger,
      preid: 'beta',
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).toContain('--tag');
    expect(publishCall?.args[0]).toContain('beta');
  });

  it('should use next tag for prerelease versions without preid', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.1-alpha.0', path: '/path/to/pkg' }],
      isDryRun: false,
      logger: mockLogger,
      // no preid
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).toContain('--tag');
    expect(publishCall?.args[0]).toContain('next');
  });
});
