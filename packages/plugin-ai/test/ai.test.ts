import { describe, expect, it, vi } from 'vitest';

import AiPlugin from '../src/ai.js';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  level: 'silent' as const,
};

function createContext(overrides = {}) {
  return {
    config: {},
    packages: [],
    changedPackages: [],
    rootPath: '/root',
    isDryRun: false,
    logger: mockLogger,
    actionLog: { record: vi.fn(), entries: () => [] },
    commits: [
      {
        hash: 'abc',
        message: 'feat: add auth',
        author: 'dev',
        date: new Date(),
        files: [],
        packages: ['pkg'],
      },
      {
        hash: 'def',
        message: 'fix: memory leak',
        author: 'dev',
        date: new Date(),
        files: [],
        packages: ['pkg'],
      },
    ],
    currentPackage: { name: 'pkg', version: '1.0.0', path: '/root/packages/pkg', private: false },
    versions: { pkg: '1.0.0' },
    bumps: { pkg: 'minor' },
    changelogs: { pkg: '## [1.0.0] - 2026-02-10\n\n### ✨ Features\n\n- feat: add auth' },
    ...overrides,
  };
}

describe('AiPlugin', () => {
  it('should have correct name', () => {
    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    expect(plugin.name).toBe('ai');
  });

  it('should throw if no API key', () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(() => new AiPlugin({ provider: 'openai' })).toThrow('Missing API key');

    if (original) process.env.OPENAI_API_KEY = original;
  });

  it('should read API key from env var', () => {
    process.env.OPENAI_API_KEY = 'env-key';
    const plugin = new AiPlugin({ provider: 'openai' });
    expect(plugin.name).toBe('ai');
    delete process.env.OPENAI_API_KEY;
  });

  it('should read ANTHROPIC_API_KEY from env', () => {
    process.env.ANTHROPIC_API_KEY = 'env-key';
    const plugin = new AiPlugin({ provider: 'anthropic' });
    expect(plugin.name).toBe('ai');
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should read GEMINI_API_KEY from env', () => {
    process.env.GEMINI_API_KEY = 'env-key';
    const plugin = new AiPlugin({ provider: 'gemini' });
    expect(plugin.name).toBe('ai');
    delete process.env.GEMINI_API_KEY;
  });

  it('should prepend AI summary to changelog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'AI summary here.' } }] }),
      }),
    );

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    const mockBonvoy = { hooks: { afterChangelog: { tapPromise: afterChangelogTap } } };

    plugin.apply(mockBonvoy);
    expect(afterChangelogTap).toHaveBeenCalledWith('ai', expect.any(Function));

    const handler = afterChangelogTap.mock.calls[0][1];
    const context = createContext();
    await handler(context);

    expect(context.changelogs.pkg).toContain('> AI summary here.');
    expect(context.changelogs.pkg).toContain('### ✨ Features');

    vi.unstubAllGlobals();
  });

  it('should skip in dry-run mode', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    await handler(createContext({ isDryRun: true }));

    expect(mockFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should skip if no changelog for package', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    await handler(createContext({ changelogs: {} }));

    expect(mockFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should skip if no current package', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    await handler(createContext({ currentPackage: undefined }));

    expect(mockFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should skip if no commits for package', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    await handler(createContext({ commits: [] }));

    expect(mockFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should skip if commits is undefined', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    await handler(createContext({ commits: undefined }));

    expect(mockFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should skip if no commits match current package', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    const context = createContext({
      commits: [
        {
          hash: 'abc',
          message: 'feat: other',
          author: 'dev',
          date: new Date(),
          files: [],
          packages: ['other-pkg'],
        },
      ],
    });
    await handler(context);

    expect(mockFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should not modify changelog if summary is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: '   ' } }] }),
      }),
    );

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    const context = createContext();
    const originalChangelog = context.changelogs.pkg;
    await handler(context);

    expect(context.changelogs.pkg).toBe(originalChangelog);

    vi.unstubAllGlobals();
  });

  it('should warn and keep changelog on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    const context = createContext();
    const originalChangelog = context.changelogs.pkg;
    await handler(context);

    expect(context.changelogs.pkg).toBe(originalChangelog);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('AI summary failed'));

    vi.unstubAllGlobals();
  });

  it('should use anthropic provider', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'Anthropic summary.' }] }),
      }),
    );

    const plugin = new AiPlugin({ provider: 'anthropic', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    const context = createContext();
    await handler(context);

    expect(context.changelogs.pkg).toContain('> Anthropic summary.');

    vi.unstubAllGlobals();
  });

  it('should use gemini provider', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ candidates: [{ content: { parts: [{ text: 'Gemini summary.' }] } }] }),
      }),
    );

    const plugin = new AiPlugin({ provider: 'gemini', apiKey: 'key' });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    const context = createContext();
    await handler(context);

    expect(context.changelogs.pkg).toContain('> Gemini summary.');

    vi.unstubAllGlobals();
  });

  it('should use custom prompt template', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Custom.' } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const plugin = new AiPlugin({
      provider: 'openai',
      apiKey: 'key',
      promptTemplate: 'Custom prompt for {packageName}:\n{commitList}',
    });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    await handler(createContext());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('Custom prompt for pkg:');

    vi.unstubAllGlobals();
  });

  it('should use custom maxTokens', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Short.' } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const plugin = new AiPlugin({ provider: 'openai', apiKey: 'key', maxTokens: 100 });
    const afterChangelogTap = vi.fn();
    plugin.apply({ hooks: { afterChangelog: { tapPromise: afterChangelogTap } } });

    const handler = afterChangelogTap.mock.calls[0][1];
    await handler(createContext());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(100);

    vi.unstubAllGlobals();
  });
});
