import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultSlackOperations } from '../src/operations.js';

describe('defaultSlackOperations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  describe('sendWebhook', () => {
    it('should send webhook with correct payload', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await defaultSlackOperations.sendWebhook('https://hooks.slack.com/test', {
        text: 'Test',
        blocks: [],
      });

      expect(mockFetch).toHaveBeenCalledWith('https://hooks.slack.com/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test', blocks: [] }),
      });
    });

    it('should throw on non-ok response', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(
        defaultSlackOperations.sendWebhook('https://hooks.slack.com/test', {
          text: 'Test',
          blocks: [],
        }),
      ).rejects.toThrow('Slack webhook failed: 400 Bad Request');
    });
  });

  describe('sendApi', () => {
    it('should call WebClient.chat.postMessage', async () => {
      const mockPostMessage = vi.fn().mockResolvedValue({ ok: true });

      vi.doMock('@slack/web-api', () => ({
        WebClient: class {
          chat = { postMessage: mockPostMessage };
        },
      }));

      const { defaultSlackOperations: ops } = await import('../src/operations.js');

      await ops.sendApi('xoxb-test', '#releases', {
        text: 'Test',
        blocks: [{ type: 'section' }],
        username: 'bonvoy',
        icon_emoji: ':rocket:',
      });

      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: '#releases',
        text: 'Test',
        blocks: [{ type: 'section' }],
        username: 'bonvoy',
        icon_emoji: ':rocket:',
      });
    });
  });
});
