import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultTelegramOperations } from '../src/operations.js';

describe('defaultTelegramOperations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should send message with correct payload', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true } as Response);

    await defaultTelegramOperations.sendMessage(
      { botToken: 'token123', chatId: '12345' },
      'Test message',
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottoken123/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          chat_id: '12345',
          text: 'Test message',
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }),
    );
  });

  it('should throw on non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' } as Response);

    await expect(
      defaultTelegramOperations.sendMessage({ botToken: 'token', chatId: '123' }, 'Test'),
    ).rejects.toThrow('Telegram API failed: 400 Bad Request');
  });
});
