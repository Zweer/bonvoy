import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function writeChangelog(
  packagePath: string,
  newContent: string,
  _version: string,
): Promise<void> {
  const changelogPath = join(packagePath, 'CHANGELOG.md');

  try {
    // Try to read existing changelog
    const existingContent = await readFile(changelogPath, 'utf-8');
    const updatedContent = prependToChangelog(existingContent, newContent);
    await writeFile(changelogPath, updatedContent, 'utf-8');
  } catch (_error) {
    // File doesn't exist, create new one
    const newChangelog = createNewChangelog(newContent);
    await writeFile(changelogPath, newChangelog, 'utf-8');
  }
}

function prependToChangelog(existing: string, newContent: string): string {
  const lines = existing.split('\n');

  // Find where to insert new content (after # Changelog header)
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      insertIndex = i + 1;
      // Skip empty lines after header
      while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
        insertIndex++;
      }
      break;
    }
  }

  // Insert new content
  const before = lines.slice(0, insertIndex);
  const after = lines.slice(insertIndex);

  return [...before, '', newContent, '', ...after].join('\n');
}

function createNewChangelog(content: string): string {
  return [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),',
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
    '',
    content,
    '',
  ].join('\n');
}
