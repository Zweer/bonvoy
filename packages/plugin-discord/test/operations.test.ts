import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultDiscordOperations } from '../src/operations.js';

describe('defaultDiscordOperations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should send webhook with correct payload', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true } as Response);

    await defaultDiscordOperations.sendWebhook('https://discord.com/api/webhooks/test', {
      embeds: [{ title: 'Test' }],
    });

    expect(mockFetch).toHaveBeenCalledWith('https://discord.com/api/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ title: 'Test' }] }),
    });
  });

  it('should throw on non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' } as Response);

    await expect(
      defaultDiscordOperations.sendWebhook('https://discord.com/api/webhooks/test', {
        embeds: [],
      }),
    ).rejects.toThrow('Discord webhook failed: 400 Bad Request');
  });
});
