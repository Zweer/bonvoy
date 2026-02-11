import { beforeEach, describe, expect, it, vi } from 'vitest';

import DiscordPlugin from '../src/discord.js';
import type { DiscordOperations } from '../src/operations.js';

const createMockOps = (): DiscordOperations & {
  calls: Array<{ url: string; payload: unknown }>;
} => ({
  calls: [],
  async sendWebhook(url, payload) {
    this.calls.push({ url, payload });
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
  hooks: {
    afterRelease: { tapPromise: vi.fn() },
  },
});

describe('DiscordPlugin', () => {
  let mockOps: ReturnType<typeof createMockOps>;

  beforeEach(() => {
    mockOps = createMockOps();
  });

  it('should have correct name', () => {
    const plugin = new DiscordPlugin({ webhookUrl: 'https://test.com' }, mockOps);
    expect(plugin.name).toBe('discord');
  });

  it('should throw if webhookUrl is missing', () => {
    expect(() => new DiscordPlugin({} as never)).toThrow('webhookUrl');
  });

  it('should send notification to webhook', async () => {
    const plugin = new DiscordPlugin(
      { webhookUrl: 'https://discord.com/api/webhooks/test' },
      mockOps,
    );
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(mockOps.calls).toHaveLength(1);
    expect(mockOps.calls[0].url).toBe('https://discord.com/api/webhooks/test');
    expect(mockOps.calls[0].payload).toHaveProperty('embeds');
  });

  it('should not send in dry-run mode', async () => {
    const plugin = new DiscordPlugin(
      { webhookUrl: 'https://discord.com/api/webhooks/test' },
      mockOps,
    );
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext({ isDryRun: true }));

    expect(mockOps.calls).toHaveLength(0);
  });

  it('should include username in payload', async () => {
    const plugin = new DiscordPlugin(
      { webhookUrl: 'https://discord.com/api/webhooks/test', username: 'bonvoy' },
      mockOps,
    );
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(mockOps.calls[0].payload).toHaveProperty('username', 'bonvoy');
  });
});
