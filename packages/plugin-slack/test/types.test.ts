import type { NotificationMessage } from '@bonvoy/plugin-notification';
import { describe, expect, it } from 'vitest';

import { buildSlackPayload } from '../src/types.js';

const createMessage = (overrides = {}): NotificationMessage => ({
  title: '🚀 Released 2 package(s)',
  packages: [
    {
      name: '@test/core',
      version: '1.0.0',
      changelog: '- feat: new',
      npmUrl: 'https://npmjs.com/package/@test/core',
    },
    { name: '@test/cli', version: '2.0.0', npmUrl: 'https://npmjs.com/package/@test/cli' },
  ],
  isSuccess: true,
  timestamp: new Date(),
  ...overrides,
});

describe('buildSlackPayload', () => {
  it('should build basic payload', () => {
    const message = createMessage();
    const config = { webhookUrl: 'https://hooks.slack.com/test' };

    const payload = buildSlackPayload(message, config);

    expect(payload.text).toBe('🚀 Released 2 package(s)');
    expect(payload.blocks).toHaveLength(4); // header + packages + divider + changelog
    expect(payload.blocks[0].type).toBe('header');
  });

  it('should include channel and username', () => {
    const message = createMessage();
    const config = {
      webhookUrl: 'https://hooks.slack.com/test',
      channel: '#releases',
      username: 'Release Bot',
      iconEmoji: ':rocket:',
    };

    const payload = buildSlackPayload(message, config);

    expect(payload.channel).toBe('#releases');
    expect(payload.username).toBe('Release Bot');
    expect(payload.icon_emoji).toBe(':rocket:');
  });

  it('should include mentions', () => {
    const message = createMessage();
    const config = {
      webhookUrl: 'https://hooks.slack.com/test',
      mentions: ['@here', '<@U123>'],
    };

    const payload = buildSlackPayload(message, config);

    expect(payload.blocks[1].type).toBe('section');
    expect(payload.blocks[1].text?.text).toBe('@here <@U123>');
  });

  it('should format package list with links', () => {
    const message = createMessage();
    const config = { webhookUrl: 'https://hooks.slack.com/test' };

    const payload = buildSlackPayload(message, config);

    const packagesBlock = payload.blocks[1];
    expect(packagesBlock.text?.text).toContain('*@test/core@1.0.0*');
    expect(packagesBlock.text?.text).toContain('<https://npmjs.com/package/@test/core|npm>');
  });

  it('should include changelog sections', () => {
    const message = createMessage();
    const config = { webhookUrl: 'https://hooks.slack.com/test' };

    const payload = buildSlackPayload(message, config);

    // Find changelog block
    const changelogBlock = payload.blocks.find(
      (b) => b.type === 'section' && b.text?.text?.includes('- feat: new'),
    );
    expect(changelogBlock).toBeDefined();
    expect(changelogBlock?.text?.text).toContain('*@test/core*');
  });

  it('should handle packages without changelog', () => {
    const message = createMessage({
      packages: [{ name: '@test/pkg', version: '1.0.0' }],
    });
    const config = { webhookUrl: 'https://hooks.slack.com/test' };

    const payload = buildSlackPayload(message, config);

    // Should not have divider or changelog section
    expect(payload.blocks.filter((b) => b.type === 'divider')).toHaveLength(0);
  });
});
