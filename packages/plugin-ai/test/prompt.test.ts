import { describe, expect, it } from 'vitest';

import { buildPrompt, insertSummary } from '../src/prompt.js';

describe('buildPrompt', () => {
  const commits = [
    {
      hash: 'abc1234',
      message: 'feat: add auth',
      author: 'dev',
      date: new Date(),
      files: [],
      packages: ['core'],
    },
    {
      hash: 'def5678',
      message: 'fix: memory leak',
      author: 'dev',
      date: new Date(),
      files: [],
      packages: ['core'],
    },
  ];

  it('should build prompt with default template', () => {
    const result = buildPrompt(commits, '@bonvoy/core', '1.0.0');
    expect(result).toContain('Package: @bonvoy/core');
    expect(result).toContain('Version: 1.0.0');
    expect(result).toContain('- feat: add auth');
    expect(result).toContain('- fix: memory leak');
  });

  it('should use custom template', () => {
    const result = buildPrompt(
      commits,
      'pkg',
      '1.0.0',
      'Summarize {packageName} v{version}:\n{commitList}',
    );
    expect(result).toBe('Summarize pkg v1.0.0:\n- feat: add auth\n- fix: memory leak');
  });

  it('should truncate to 50 commits', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      hash: `h${i}`,
      message: `fix: bug ${i}`,
      author: 'dev',
      date: new Date(),
      files: [],
      packages: ['p'],
    }));
    const result = buildPrompt(many, 'p', '1.0.0');
    const lines = result.split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toHaveLength(50);
  });
});

describe('insertSummary', () => {
  it('should insert blockquote after version header', () => {
    const changelog = '## [1.0.0] - 2026-02-10\n\n### ✨ Features\n\n- feat: add auth';
    const result = insertSummary(changelog, 'Adds authentication support.');
    expect(result).toBe(
      '## [1.0.0] - 2026-02-10\n\n> Adds authentication support.\n\n### ✨ Features\n\n- feat: add auth',
    );
  });

  it('should handle multi-line summary', () => {
    const changelog = '## [1.0.0] - 2026-02-10\n\n### Features';
    const result = insertSummary(changelog, 'Line one.\nLine two.');
    expect(result).toContain('> Line one.\n> Line two.');
  });

  it('should handle changelog without newline', () => {
    const result = insertSummary('## [1.0.0]', 'Summary.');
    expect(result).toBe('## [1.0.0]\n\n> Summary.');
  });
});
