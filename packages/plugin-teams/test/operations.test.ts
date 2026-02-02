import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultTeamsOperations } from '../src/operations.js';

describe('defaultTeamsOperations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should send webhook with correct payload', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true } as Response);

    const card = {
      '@type': 'MessageCard' as const,
      '@context': 'http://schema.org/extensions',
      themeColor: '57F287',
      summary: 'Test',
      sections: [],
    };

    await defaultTeamsOperations.sendWebhook('https://teams.webhook.url', card);

    expect(mockFetch).toHaveBeenCalledWith('https://teams.webhook.url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
  });

  it('should throw on non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' } as Response);

    await expect(
      defaultTeamsOperations.sendWebhook('https://teams.webhook.url', {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '57F287',
        summary: 'Test',
        sections: [],
      }),
    ).rejects.toThrow('Teams webhook failed: 400 Bad Request');
  });
});
