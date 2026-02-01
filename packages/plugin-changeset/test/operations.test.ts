import { describe, expect, it } from 'vitest';

import {
  type ChangesetFile,
  isBumpType,
  mergeChangesets,
  parseChangesetFile,
} from '../src/operations.js';

describe('parseChangesetFile', () => {
  it('should parse frontmatter and content', () => {
    const content = `---
"@scope/core": minor
"@scope/utils": patch
---

Added new feature.`;

    const result = parseChangesetFile(content);

    expect(result.packages).toEqual({
      '@scope/core': 'minor',
      '@scope/utils': 'patch',
    });
    expect(result.notes).toBe('Added new feature.');
  });

  it('should handle explicit versions', () => {
    const content = `---
"@scope/core": "2.0.0"
---

Breaking change.`;

    const result = parseChangesetFile(content);

    expect(result.packages).toEqual({ '@scope/core': '2.0.0' });
    expect(result.notes).toBe('Breaking change.');
  });

  it('should handle empty notes', () => {
    const content = `---
"@scope/core": minor
---`;

    const result = parseChangesetFile(content);

    expect(result.packages).toEqual({ '@scope/core': 'minor' });
    expect(result.notes).toBe('');
  });

  it('should handle multi-line notes', () => {
    const content = `---
"@scope/core": minor
---

First line.

Second line.`;

    const result = parseChangesetFile(content);

    expect(result.notes).toBe('First line.\n\nSecond line.');
  });
});

describe('isBumpType', () => {
  it('should return true for valid bump types', () => {
    expect(isBumpType('major')).toBe(true);
    expect(isBumpType('minor')).toBe(true);
    expect(isBumpType('patch')).toBe(true);
  });

  it('should return false for versions', () => {
    expect(isBumpType('2.0.0')).toBe(false);
    expect(isBumpType('1.0.0-beta.1')).toBe(false);
  });
});

describe('mergeChangesets', () => {
  it('should merge single file', () => {
    const files: ChangesetFile[] = [
      { path: '/test/a.md', packages: { '@scope/core': 'minor' }, notes: 'Feature A' },
    ];

    const result = mergeChangesets(files);

    expect(result.get('@scope/core')).toEqual({ bump: 'minor', notes: ['Feature A'] });
  });

  it('should take highest bump when merging', () => {
    const files: ChangesetFile[] = [
      { path: '/test/a.md', packages: { '@scope/core': 'patch' }, notes: 'Fix A' },
      { path: '/test/b.md', packages: { '@scope/core': 'minor' }, notes: 'Feature B' },
    ];

    const result = mergeChangesets(files);

    expect(result.get('@scope/core')).toEqual({
      bump: 'minor',
      notes: ['Fix A', 'Feature B'],
    });
  });

  it('should prefer explicit version over bump', () => {
    const files: ChangesetFile[] = [
      { path: '/test/a.md', packages: { '@scope/core': 'minor' }, notes: 'Feature' },
      { path: '/test/b.md', packages: { '@scope/core': '2.0.0' }, notes: 'Breaking' },
    ];

    const result = mergeChangesets(files);

    expect(result.get('@scope/core')?.bump).toBe('2.0.0');
  });

  it('should handle multiple packages', () => {
    const files: ChangesetFile[] = [
      {
        path: '/test/a.md',
        packages: { '@scope/core': 'minor', '@scope/utils': 'patch' },
        notes: 'Changes',
      },
    ];

    const result = mergeChangesets(files);

    expect(result.size).toBe(2);
    expect(result.get('@scope/core')?.bump).toBe('minor');
    expect(result.get('@scope/utils')?.bump).toBe('patch');
  });

  it('should handle empty notes', () => {
    const files: ChangesetFile[] = [
      { path: '/test/a.md', packages: { '@scope/core': 'minor' }, notes: '' },
    ];

    const result = mergeChangesets(files);

    expect(result.get('@scope/core')?.notes).toEqual([]);
  });

  it('should concatenate notes from multiple files', () => {
    const files: ChangesetFile[] = [
      { path: '/test/a.md', packages: { '@scope/core': 'minor' }, notes: 'Note 1' },
      { path: '/test/b.md', packages: { '@scope/core': 'patch' }, notes: 'Note 2' },
      { path: '/test/c.md', packages: { '@scope/core': 'patch' }, notes: '' },
    ];

    const result = mergeChangesets(files);

    expect(result.get('@scope/core')?.notes).toEqual(['Note 1', 'Note 2']);
  });

  it('should keep explicit version when merging with bump', () => {
    const files: ChangesetFile[] = [
      { path: '/test/a.md', packages: { '@scope/core': '2.0.0' }, notes: 'Breaking' },
      { path: '/test/b.md', packages: { '@scope/core': 'minor' }, notes: 'Feature' },
    ];

    const result = mergeChangesets(files);

    // Explicit version should be kept, bump type ignored
    expect(result.get('@scope/core')?.bump).toBe('2.0.0');
  });

  it('should handle major > minor > patch ordering', () => {
    const files: ChangesetFile[] = [
      { path: '/test/a.md', packages: { '@scope/core': 'minor' }, notes: '' },
      { path: '/test/b.md', packages: { '@scope/core': 'major' }, notes: '' },
      { path: '/test/c.md', packages: { '@scope/core': 'patch' }, notes: '' },
    ];

    const result = mergeChangesets(files);

    expect(result.get('@scope/core')?.bump).toBe('major');
  });
});
