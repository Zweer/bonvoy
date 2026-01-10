import { describe, expect, it } from 'vitest';

import { generateTemplate } from '../src/template.js';

// Helper function to create mock CommitInfo
const createMockCommit = (message: string, hash = 'abc1234567890') => ({
  hash,
  message,
  author: 'test@example.com',
  date: new Date('2026-01-10'),
  files: ['src/test.ts'],
  packages: ['@test/package'],
});

const createMockPackage = (name = '@test/package', version = '1.0.0') => ({
  name,
  version,
  path: '/test/package',
  packageJson: { name, version },
});

describe('generateTemplate', () => {
  it('should generate changelog for single commit', () => {
    const commits = [createMockCommit('feat: add new feature')];
    const pkg = createMockPackage();
    const config = {
      sections: { feat: '✨ Features' },
      includeCommitHash: false,
    };

    const result = generateTemplate(commits, pkg, config);

    expect(result).toContain('## [1.0.0] - 2026-01-10');
    expect(result).toContain('### ✨ Features');
    expect(result).toContain('- feat: add new feature');
  });

  it('should group commits by type', () => {
    const commits = [
      createMockCommit('feat: add feature'),
      createMockCommit('fix: resolve bug'),
      createMockCommit('feat: another feature'),
    ];
    const pkg = createMockPackage();
    const config = {
      sections: { feat: '✨ Features', fix: '🐛 Bug Fixes' },
    };

    const result = generateTemplate(commits, pkg, config);

    expect(result).toContain('### ✨ Features');
    expect(result).toContain('### 🐛 Bug Fixes');
    expect(result).toContain('- feat: add feature');
    expect(result).toContain('- feat: another feature');
    expect(result).toContain('- fix: resolve bug');
  });

  it('should handle breaking changes', () => {
    const commits = [
      createMockCommit('feat!: breaking change'),
      createMockCommit('feat: add feature\n\nBREAKING CHANGE: removed old API'),
    ];
    const pkg = createMockPackage();
    const config = {
      sections: { breaking: '💥 Breaking Changes', feat: '✨ Features' },
    };

    const result = generateTemplate(commits, pkg, config);

    expect(result).toContain('### 💥 Breaking Changes');
    expect(result).toContain('- feat!: breaking change');
    expect(result).toContain('- feat: add feature');
  });

  it('should include commit hash when configured', () => {
    const commits = [createMockCommit('feat: add feature', 'abcdef123456')];
    const pkg = createMockPackage();
    const config = {
      sections: { feat: '✨ Features' },
      includeCommitHash: true,
    };

    const result = generateTemplate(commits, pkg, config);

    expect(result).toContain('- feat: add feature (abcdef1)');
  });

  it('should handle empty commits', () => {
    const commits: never[] = [];
    const pkg = createMockPackage();
    const config = {};

    const result = generateTemplate(commits, pkg, config);

    expect(result).toContain('## [1.0.0] - 2026-01-10');
    expect(result.split('\n').length).toBeLessThan(5); // Just header
  });

  it('should ignore non-conventional commits', () => {
    const commits = [
      createMockCommit('feat: valid commit'),
      createMockCommit('random commit message'),
      createMockCommit('another invalid message'),
    ];
    const pkg = createMockPackage();
    const config = {
      sections: { feat: '✨ Features' },
    };

    const result = generateTemplate(commits, pkg, config);

    expect(result).toContain('### ✨ Features');
    expect(result).toContain('- feat: valid commit');
    expect(result).not.toContain('random commit message');
    expect(result).not.toContain('another invalid message');
  });

  it('should sort sections by priority', () => {
    const commits = [
      createMockCommit('perf: optimize'),
      createMockCommit('feat!: breaking'),
      createMockCommit('fix: bug fix'),
      createMockCommit('feat: feature'),
    ];
    const pkg = createMockPackage();
    const config = {
      sections: {
        breaking: '💥 Breaking Changes',
        feat: '✨ Features',
        fix: '🐛 Bug Fixes',
        perf: '⚡ Performance',
      },
    };

    const result = generateTemplate(commits, pkg, config);
    const lines = result.split('\n');

    const breakingIndex = lines.findIndex((line) => line.includes('💥 Breaking Changes'));
    const featIndex = lines.findIndex((line) => line.includes('✨ Features'));
    const fixIndex = lines.findIndex((line) => line.includes('🐛 Bug Fixes'));
    const perfIndex = lines.findIndex((line) => line.includes('⚡ Performance'));

    expect(breakingIndex).toBeLessThan(featIndex);
    expect(featIndex).toBeLessThan(fixIndex);
    expect(fixIndex).toBeLessThan(perfIndex);
  });

  it('should use default section title when not configured', () => {
    const commits = [createMockCommit('custom: some change')];
    const pkg = createMockPackage();
    const config = {}; // No sections configured

    const result = generateTemplate(commits, pkg, config);

    expect(result).toContain('### custom'); // Should use default format
  });

  it('should handle unknown commit types in sorting', () => {
    const commits = [
      createMockCommit('unknown: some change'),
      createMockCommit('feat: feature'),
      createMockCommit('another: change'),
    ];
    const pkg = createMockPackage();
    const config = {
      sections: {
        feat: '✨ Features',
        unknown: '❓ Unknown',
        another: '🔧 Another',
      },
    };

    const result = generateTemplate(commits, pkg, config);

    // Should contain all sections
    expect(result).toContain('### ✨ Features');
    expect(result).toContain('### ❓ Unknown');
    expect(result).toContain('### 🔧 Another');
  });
});
