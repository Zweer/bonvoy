import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeamsOperations } from '../src/operations.js';
import TeamsPlugin from '../src/teams.js';

const createMockOps = (): TeamsOperations & { calls: Array<{ url: string; card: unknown }> } => ({
  calls: [],
  async sendWebhook(url, card) {
    this.calls.push({ url, card });
  },
});

const createMockContext = (overrides = {}) => ({
  config: {},
  packages: [],
  changedPackages: [{ name: '@test/pkg', version: '1.0.0', path: '/test' }],
  rootPath: '/test',
  isDryRun: false,
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    level: 'silent' as const,
  },
  commits: [],
  versions: { '@test/pkg': '1.1.0' },
  bumps: { '@test/pkg': 'minor' },
  changelogs: { '@test/pkg': '- feat: new feature' },
  releases: {},
  publishedPackages: [],
  ...overrides,
});

const createMockBonvoy = () => ({
  hooks: { afterRelease: { tapPromise: vi.fn() } },
});

describe('TeamsPlugin', () => {
  let mockOps: ReturnType<typeof createMockOps>;

  beforeEach(() => {
    mockOps = createMockOps();
  });

  it('should have correct name', () => {
    const plugin = new TeamsPlugin({ webhookUrl: 'https://test.com' }, mockOps);
    expect(plugin.name).toBe('teams');
  });

  it('should throw if webhookUrl is missing', () => {
    expect(() => new TeamsPlugin({} as never)).toThrow('webhookUrl');
  });

  it('should send notification', async () => {
    const plugin = new TeamsPlugin({ webhookUrl: 'https://teams.webhook.url' }, mockOps);
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(mockOps.calls).toHaveLength(1);
    expect(mockOps.calls[0].url).toBe('https://teams.webhook.url');
    expect(mockOps.calls[0].card).toHaveProperty('@type', 'MessageCard');
  });

  it('should not send in dry-run mode', async () => {
    const plugin = new TeamsPlugin({ webhookUrl: 'https://teams.webhook.url' }, mockOps);
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext({ isDryRun: true }));

    expect(mockOps.calls).toHaveLength(0);
  });
});
