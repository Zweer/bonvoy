import { beforeEach, describe, expect, it, vi } from 'vitest';

import NpmPlugin from '../src/npm.js';
import type { NpmOperations } from '../src/operations.js';

function createMockOps(): NpmOperations & {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  calls: Array<{ method: string; args: any[] }>;
  publishedVersions: Map<string, string>;
} {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  const calls: Array<{ method: string; args: any[] }> = [];
  const publishedVersions = new Map<string, string>();
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
  };
}

vi.spyOn(console, 'log').mockImplementation(() => {});

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
        publish: { tapPromise: vi.fn() },
      },
    };
  });

  it('should register hooks', () => {
    plugin.apply(mockBonvoy);
    expect(mockBonvoy.hooks.publish.tapPromise).toHaveBeenCalledWith('npm', expect.any(Function));
  });

  it('should publish packages with default config', async () => {
    plugin.apply(mockBonvoy);

    const context = {
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
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).toContain('--access');
    expect(publishCall?.args[0]).toContain('restricted');
  });

  it('should use custom registry', async () => {
    plugin = new NpmPlugin({ registry: 'https://custom.registry.com' }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).toContain('--registry');
    expect(publishCall?.args[0]).toContain('https://custom.registry.com');
  });

  it('should use default operations when none provided', () => {
    const pluginWithDefaults = new NpmPlugin();
    expect(pluginWithDefaults.name).toBe('npm');
  });

  it('should skip provenance when disabled', async () => {
    plugin = new NpmPlugin({ provenance: false }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0', path: '/path/to/pkg' }],
    };

    const publishFn = mockBonvoy.hooks.publish.tapPromise.mock.calls[0][1];
    await publishFn(context);

    const publishCall = mockOps.calls.find((c) => c.method === 'publish');
    expect(publishCall?.args[0]).not.toContain('--provenance');
  });
});
