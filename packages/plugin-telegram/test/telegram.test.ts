import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TelegramOperations } from '../src/operations.js';
import TelegramPlugin from '../src/telegram.js';

const createMockOps = (): TelegramOperations & { calls: Array<{ text: string }> } => ({
  calls: [],
  async sendMessage(_config, text) {
    this.calls.push({ text });
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

describe('TelegramPlugin', () => {
  let mockOps: ReturnType<typeof createMockOps>;

  beforeEach(() => {
    mockOps = createMockOps();
  });

  it('should have correct name', () => {
    const plugin = new TelegramPlugin({ botToken: 'token', chatId: '123' }, mockOps);
    expect(plugin.name).toBe('telegram');
  });

  it('should throw if botToken is missing', () => {
    expect(() => new TelegramPlugin({ chatId: '123' } as never)).toThrow('botToken');
  });

  it('should throw if chatId is missing', () => {
    expect(() => new TelegramPlugin({ botToken: 'token' } as never)).toThrow('chatId');
  });

  it('should send notification', async () => {
    const plugin = new TelegramPlugin({ botToken: 'token', chatId: '123' }, mockOps);
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(mockOps.calls).toHaveLength(1);
    expect(mockOps.calls[0].text).toContain('@test/pkg');
  });

  it('should not send in dry-run mode', async () => {
    const plugin = new TelegramPlugin({ botToken: 'token', chatId: '123' }, mockOps);
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext({ isDryRun: true }));

    expect(mockOps.calls).toHaveLength(0);
  });
});
