import { describe, expect, it } from 'vitest';

import { buildDiscordPayload } from '../src/types.js';

describe('buildDiscordPayload', () => {
  const baseMessage = {
    title: '🚀 Released 1 package',
    isSuccess: true,
    timestamp: new Date(),
    packages: [{ name: '@test/pkg', version: '1.0.0' }],
  };

  it('should create embed with title and description', () => {
    const payload = buildDiscordPayload(baseMessage, { webhookUrl: 'https://test.com' });

    expect(payload.embeds[0].title).toBe('🚀 Released 1 package');
    expect(payload.embeds[0].description).toContain('@test/pkg@1.0.0');
  });

  it('should use green color for success', () => {
    const payload = buildDiscordPayload(baseMessage, { webhookUrl: 'https://test.com' });
    expect(payload.embeds[0].color).toBe(0x57f287);
  });

  it('should use red color for failure', () => {
    const payload = buildDiscordPayload(
      { ...baseMessage, isSuccess: false },
      { webhookUrl: 'https://test.com' },
    );
    expect(payload.embeds[0].color).toBe(0xed4245);
  });

  it('should include npm and github links', () => {
    const payload = buildDiscordPayload(
      {
        ...baseMessage,
        packages: [
          {
            name: '@test/pkg',
            version: '1.0.0',
            npmUrl: 'https://npm.com/pkg',
            githubUrl: 'https://github.com/release',
          },
        ],
      },
      { webhookUrl: 'https://test.com' },
    );

    expect(payload.embeds[0].description).toContain('[npm](https://npm.com/pkg)');
    expect(payload.embeds[0].description).toContain('[release](https://github.com/release)');
  });

  it('should add changelog embeds', () => {
    const payload = buildDiscordPayload(
      {
        ...baseMessage,
        packages: [{ name: '@test/pkg', version: '1.0.0', changelog: '- feat: new feature' }],
      },
      { webhookUrl: 'https://test.com' },
    );

    expect(payload.embeds).toHaveLength(2);
    expect(payload.embeds[1].title).toBe('@test/pkg');
    expect(payload.embeds[1].description).toBe('- feat: new feature');
  });

  it('should include username and avatar', () => {
    const payload = buildDiscordPayload(baseMessage, {
      webhookUrl: 'https://test.com',
      username: 'bonvoy',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(payload.username).toBe('bonvoy');
    expect(payload.avatar_url).toBe('https://example.com/avatar.png');
  });
});
