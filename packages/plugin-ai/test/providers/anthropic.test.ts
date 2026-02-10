import { describe, expect, it, vi } from 'vitest';

import { AnthropicProvider } from '../../src/providers/anthropic.js';

describe('AnthropicProvider', () => {
  it('should call Anthropic API and return text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: '  Summary text  ' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new AnthropicProvider('test-key');
    const result = await provider.generateText('prompt', 200);

    expect(result).toBe('Summary text');
    expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-key',
        'anthropic-version': '2023-06-01',
      },
      body: expect.stringContaining('"model":"claude-sonnet-4-20250514"'),
    });

    vi.unstubAllGlobals();
  });

  it('should use custom model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: 'text' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new AnthropicProvider('key', 'claude-haiku-3-20250414');
    await provider.generateText('prompt', 200);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"model":"claude-haiku-3-20250414"'),
      }),
    );

    vi.unstubAllGlobals();
  });

  it('should throw on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }),
    );

    const provider = new AnthropicProvider('bad-key');
    await expect(provider.generateText('prompt', 200)).rejects.toThrow(
      'Anthropic API error: 401 Unauthorized',
    );

    vi.unstubAllGlobals();
  });
});
