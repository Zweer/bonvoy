import { describe, expect, it } from 'vitest';

import { buildTelegramMessage } from '../src/types.js';

describe('buildTelegramMessage', () => {
  const baseMessage = {
    title: '🚀 Released 1 package',
    isSuccess: true,
    timestamp: new Date(),
    packages: [{ name: '@test/pkg', version: '1.0.0' }],
  };

  it('should create message with title', () => {
    const text = buildTelegramMessage(baseMessage);
    expect(text).toContain('<b>🚀 Released 1 package</b>');
  });

  it('should include package info', () => {
    const text = buildTelegramMessage(baseMessage);
    expect(text).toContain('<b>@test/pkg@1.0.0</b>');
  });

  it('should include links', () => {
    const text = buildTelegramMessage({
      ...baseMessage,
      packages: [
        {
          name: '@test/pkg',
          version: '1.0.0',
          npmUrl: 'https://npm.com',
          githubUrl: 'https://github.com',
        },
      ],
    });
    expect(text).toContain('<a href="https://npm.com">npm</a>');
    expect(text).toContain('<a href="https://github.com">release</a>');
  });

  it('should include changelog in pre block', () => {
    const text = buildTelegramMessage({
      ...baseMessage,
      packages: [{ name: '@test/pkg', version: '1.0.0', changelog: '- feat: new' }],
    });
    expect(text).toContain('<pre>- feat: new</pre>');
  });

  it('should escape HTML characters', () => {
    const text = buildTelegramMessage({
      ...baseMessage,
      packages: [
        { name: '@test/pkg', version: '1.0.0', changelog: '<script>alert("xss")</script>' },
      ],
    });
    expect(text).toContain('&lt;script&gt;');
    expect(text).not.toContain('<script>');
  });
});
