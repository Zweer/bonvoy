import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeChangelog } from '../src/writer.js';

const testDir = '/tmp/bonvoy-changelog-test';

describe('writeChangelog', () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should create new changelog file', async () => {
    const content = '## [1.0.0] - 2026-01-10\n\n### ✨ Features\n- feat: add feature';

    await writeChangelog(testDir, content, '1.0.0');

    const result = await readFile(join(testDir, 'CHANGELOG.md'), 'utf-8');

    expect(result).toContain('# Changelog');
    expect(result).toContain(
      'All notable changes to this project will be documented in this file.',
    );
    expect(result).toContain('## [1.0.0] - 2026-01-10');
    expect(result).toContain('### ✨ Features');
    expect(result).toContain('- feat: add feature');
  });

  it('should prepend to existing changelog', async () => {
    const existingContent = [
      '# Changelog',
      '',
      'All notable changes to this project will be documented in this file.',
      '',
      '## [0.9.0] - 2026-01-08',
      '',
      '### 🐛 Bug Fixes',
      '- fix: old bug fix',
      '',
    ].join('\n');

    await writeFile(join(testDir, 'CHANGELOG.md'), existingContent, 'utf-8');

    const newContent = '## [1.0.0] - 2026-01-10\n\n### ✨ Features\n- feat: new feature';

    await writeChangelog(testDir, newContent, '1.0.0');

    const result = await readFile(join(testDir, 'CHANGELOG.md'), 'utf-8');

    expect(result).toContain('# Changelog');
    expect(result).toContain('## [1.0.0] - 2026-01-10');
    expect(result).toContain('- feat: new feature');
    expect(result).toContain('## [0.9.0] - 2026-01-08');
    expect(result).toContain('- fix: old bug fix');

    // New content should come before old content
    const newIndex = result.indexOf('## [1.0.0]');
    const oldIndex = result.indexOf('## [0.9.0]');
    expect(newIndex).toBeLessThan(oldIndex);
  });

  it('should handle changelog with custom header', async () => {
    const existingContent = [
      '# My Custom Changelog',
      '',
      'Custom description here.',
      '',
      '## [0.9.0] - 2026-01-08',
      '- fix: old fix',
      '',
    ].join('\n');

    await writeFile(join(testDir, 'CHANGELOG.md'), existingContent, 'utf-8');

    const newContent = '## [1.0.0] - 2026-01-10\n- feat: new feature';

    await writeChangelog(testDir, newContent, '1.0.0');

    const result = await readFile(join(testDir, 'CHANGELOG.md'), 'utf-8');

    expect(result).toContain('# My Custom Changelog');
    expect(result).toContain('Custom description here.');
    expect(result).toContain('## [1.0.0] - 2026-01-10');
    expect(result).toContain('## [0.9.0] - 2026-01-08');
  });

  it('should handle empty existing changelog', async () => {
    await writeFile(join(testDir, 'CHANGELOG.md'), '', 'utf-8');

    const newContent = '## [1.0.0] - 2026-01-10\n- feat: new feature';

    await writeChangelog(testDir, newContent, '1.0.0');

    const result = await readFile(join(testDir, 'CHANGELOG.md'), 'utf-8');

    expect(result).toContain('## [1.0.0] - 2026-01-10');
    expect(result).toContain('- feat: new feature');
  });
});
