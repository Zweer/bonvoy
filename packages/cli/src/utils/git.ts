import type { CommitInfo } from '@bonvoy/core';
import { execa } from 'execa';

export async function getCommitsSinceLastTag(rootPath: string): Promise<CommitInfo[]> {
  try {
    // Get last tag
    const { stdout: lastTag } = await execa('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: rootPath,
    });

    // Get commits since last tag
    const { stdout } = await execa(
      'git',
      ['log', `${lastTag}..HEAD`, '--pretty=format:%H|%s|%an|%aI', '--name-only'],
      { cwd: rootPath },
    );

    return parseGitLog(stdout);
  } catch {
    // No tags yet, get all commits
    const { stdout } = await execa('git', ['log', '--pretty=format:%H|%s|%an|%aI', '--name-only'], {
      cwd: rootPath,
    });

    return parseGitLog(stdout);
  }
}

export function parseGitLog(output: string): CommitInfo[] {
  const commits: CommitInfo[] = [];
  const blocks = output.split('\n\n');

  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    if (lines.length === 0) continue;

    const [hash, message, author, date] = lines[0].split('|');
    const files = lines.slice(1);

    commits.push({
      hash,
      message,
      author,
      date: new Date(date),
      files,
      packages: [],
    });
  }

  return commits;
}
