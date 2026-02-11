import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationPlugin } from '../src/base.js';
import type { NotificationMessage } from '../src/types.js';

class TestNotificationPlugin extends NotificationPlugin {
  name = 'test';
  public sentMessages: NotificationMessage[] = [];

  protected async send(message: NotificationMessage): Promise<void> {
    this.sentMessages.push(message);
  }
}

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
  changelogs: { '@test/pkg': '- feat: new' },
  releases: {},
  publishedPackages: [],
  ...overrides,
});

const createMockBonvoy = () => ({
  hooks: {
    afterRelease: { tapPromise: vi.fn() },
  },
});

describe('NotificationPlugin', () => {
  let plugin: TestNotificationPlugin;

  beforeEach(() => {
    plugin = new TestNotificationPlugin();
  });

  it('should have correct name', () => {
    expect(plugin.name).toBe('test');
  });

  it('should register afterRelease hook', () => {
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);
    expect(bonvoy.hooks.afterRelease.tapPromise).toHaveBeenCalledWith('test', expect.any(Function));
  });

  it('should send notification on successful release', async () => {
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(plugin.sentMessages).toHaveLength(1);
    expect(plugin.sentMessages[0].title).toContain('Released 1 package');
    expect(plugin.sentMessages[0].packages[0].name).toBe('@test/pkg');
  });

  it('should not send in dry-run mode', async () => {
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const context = createMockContext({ isDryRun: true });
    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(context);

    expect(plugin.sentMessages).toHaveLength(0);
    expect(context.logger.info).toHaveBeenCalledWith('🔍 [dry-run] Would send test notification');
  });

  it('should not send when onSuccess is false', async () => {
    plugin = new TestNotificationPlugin({ onSuccess: false });
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(plugin.sentMessages).toHaveLength(0);
  });

  it('should use custom config', async () => {
    plugin = new TestNotificationPlugin({
      titleTemplate: 'Custom: {count} packages',
      includeChangelog: false,
    });
    const bonvoy = createMockBonvoy();
    plugin.apply(bonvoy);

    const callback = bonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await callback(createMockContext());

    expect(plugin.sentMessages[0].title).toBe('Custom: 1 packages');
    expect(plugin.sentMessages[0].packages[0].changelog).toBeUndefined();
  });
});
