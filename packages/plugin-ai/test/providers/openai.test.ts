import { describe, expect, it, vi } from 'vitest';

import { OpenAiProvider } from '../../src/providers/openai.js';

describe('OpenAiProvider', () => {
  it('should call OpenAI API and return text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '  Summary text  ' } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new OpenAiProvider('test-key');
    const result = await provider.generateText('prompt', 200);

    expect(result).toBe('Summary text');
    expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: expect.stringContaining('"model":"gpt-4o-mini"'),
    });

    vi.unstubAllGlobals();
  });

  it('should use custom model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'text' } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new OpenAiProvider('key', 'gpt-4o');
    await provider.generateText('prompt', 200);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining('"model":"gpt-4o"') }),
    );

    vi.unstubAllGlobals();
  });

  it('should throw on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' }),
    );

    const provider = new OpenAiProvider('key');
    await expect(provider.generateText('prompt', 200)).rejects.toThrow(
      'OpenAI API error: 429 Too Many Requests',
    );

    vi.unstubAllGlobals();
  });
});
