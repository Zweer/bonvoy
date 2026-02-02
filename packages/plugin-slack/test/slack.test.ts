import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SlackOperations } from '../src/operations.js';
import SlackPlugin from '../src/slack.js';

const createMockOps = (): SlackOperations & {
  webhookCalls: Array<{ url: string; payload: unknown }>;
  apiCalls: Array<{ token: string; channel: string; payload: unknown }>;
} => ({
  webhookCalls: [],
  apiCalls: [],
  async sendWebhook(url, payload) {
    this.webhookCalls.push({ url, payload });
  },
  async sendApi(token, channel, payload) {
    this.apiCalls.push({ token, channel, payload });
  },
});

const createMockContext = (overrides = {}) => ({
  config: {},
  packages: [],
  changedPackages: [{ name: '@test/pkg', version: '1.0.0', path: '/test' }],
  rootPath: '/test',
  isDryRun: false,
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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

describe('SlackPlugin', () => {
  let mockOps: ReturnType<typeof createMockOps>;

  beforeEach(() => {
    mockOps = createMockOps();
  });

  it('should have correct name', () => {
    const plugin = new SlackPlugin({ webhookUrl: 'https://test.com' }, mockOps);
    expect(plugin.name).toBe('slack');
  });

  it('should throw if neither webhookUrl nor token is provided', () => {
    expect(() => new SlackPlugin({} as never)).toThrow('either webhookUrl or token');
  });

  it('should throw if token is provided without channel', () => {
    expect(() => new SlackPlugin({ token: 'xoxb-test' } as never)).toThrow(
      'requires channel when using token',
    );
  });

  it('should send notification via webhook', async () => {
    const plugin = new SlackPlugin({ webhookUrl: 'https://hooks.slack.com/test' }, mockOps);
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(mockOps.webhookCalls).toHaveLength(1);
    expect(mockOps.webhookCalls[0].url).toBe('https://hooks.slack.com/test');
    expect(mockOps.apiCalls).toHaveLength(0);
  });

  it('should send notification via API when token is provided', async () => {
    const plugin = new SlackPlugin({ token: 'xoxb-test', channel: '#releases' }, mockOps);
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(mockOps.apiCalls).toHaveLength(1);
    expect(mockOps.apiCalls[0].token).toBe('xoxb-test');
    expect(mockOps.apiCalls[0].channel).toBe('#releases');
    expect(mockOps.webhookCalls).toHaveLength(0);
  });

  it('should not send in dry-run mode', async () => {
    const plugin = new SlackPlugin({ webhookUrl: 'https://hooks.slack.com/test' }, mockOps);
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext({ isDryRun: true }));

    expect(mockOps.webhookCalls).toHaveLength(0);
    expect(mockOps.apiCalls).toHaveLength(0);
  });

  it('should include channel in webhook payload', async () => {
    const plugin = new SlackPlugin(
      { webhookUrl: 'https://hooks.slack.com/test', channel: '#releases' },
      mockOps,
    );
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(mockOps.webhookCalls[0].payload).toHaveProperty('channel', '#releases');
  });
});
