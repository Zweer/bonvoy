import { describe, expect, it, vi } from 'vitest';

import { GeminiProvider } from '../../src/providers/gemini.js';

describe('GeminiProvider', () => {
  it('should call Gemini API and return text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ candidates: [{ content: { parts: [{ text: '  Summary text  ' }] } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new GeminiProvider('test-key');
    const result = await provider.generateText('prompt', 200);

    expect(result).toBe('Summary text');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=test-key',
      expect.objectContaining({ method: 'POST' }),
    );

    vi.unstubAllGlobals();
  });

  it('should use custom model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'text' }] } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new GeminiProvider('key', 'gemini-1.5-pro');
    await provider.generateText('prompt', 200);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('models/gemini-1.5-pro:generateContent'),
      expect.any(Object),
    );

    vi.unstubAllGlobals();
  });

  it('should throw on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' }),
    );

    const provider = new GeminiProvider('bad-key');
    await expect(provider.generateText('prompt', 200)).rejects.toThrow(
      'Gemini API error: 403 Forbidden',
    );

    vi.unstubAllGlobals();
  });
});
