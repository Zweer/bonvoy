import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defaultChangesetOperations, readChangesetFiles } from '../src/operations.js';

describe('defaultChangesetOperations', () => {
  const testDir = join(tmpdir(), 'bonvoy-changeset-test');
  const changesetDir = join(testDir, '.changeset');

  beforeEach(() => {
    mkdirSync(changesetDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should read directory', () => {
    writeFileSync(join(changesetDir, 'test.md'), '---\n"@scope/core": minor\n---\nTest');
    writeFileSync(join(changesetDir, 'other.txt'), 'not md');

    const files = defaultChangesetOperations.readDir(changesetDir);

    expect(files).toEqual(['test.md']);
  });

  it('should return empty array for non-existent directory', () => {
    const files = defaultChangesetOperations.readDir('/non/existent/path');

    expect(files).toEqual([]);
  });

  it('should read file content', () => {
    writeFileSync(join(changesetDir, 'test.md'), 'test content');

    const content = defaultChangesetOperations.readFile(join(changesetDir, 'test.md'));

    expect(content).toBe('test content');
  });

  it('should remove file', () => {
    const filePath = join(changesetDir, 'to-delete.md');
    writeFileSync(filePath, 'delete me');

    defaultChangesetOperations.removeFile(filePath);

    expect(defaultChangesetOperations.exists(filePath)).toBe(false);
  });

  it('should check if path exists', () => {
    writeFileSync(join(changesetDir, 'exists.md'), 'content');

    expect(defaultChangesetOperations.exists(join(changesetDir, 'exists.md'))).toBe(true);
    expect(defaultChangesetOperations.exists(join(changesetDir, 'not-exists.md'))).toBe(false);
  });
});

describe('readChangesetFiles', () => {
  const testDir = join(tmpdir(), 'bonvoy-changeset-read-test');
  const changesetDir = join(testDir, '.changeset');

  beforeEach(() => {
    mkdirSync(changesetDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should skip README.md', () => {
    writeFileSync(join(changesetDir, 'README.md'), '# Changesets');
    writeFileSync(join(changesetDir, 'feature.md'), '---\n"@scope/core": minor\n---\nFeature');

    const files = readChangesetFiles(testDir, defaultChangesetOperations);

    expect(files).toHaveLength(1);
    expect(files[0].path).toContain('feature.md');
  });

  it('should skip files with no packages', () => {
    writeFileSync(join(changesetDir, 'empty.md'), '---\n---\nNo packages');

    const files = readChangesetFiles(testDir, defaultChangesetOperations);

    expect(files).toHaveLength(0);
  });
});
