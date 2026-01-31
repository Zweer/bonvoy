import type { CommitInfo } from '@bonvoy/core';
import { defaultGitOperations, type GitOperations } from '@bonvoy/plugin-git';

export async function getCommitsSinceLastTag(
  rootPath: string,
  ops: GitOperations = defaultGitOperations,
): Promise<CommitInfo[]> {
  const lastTag = await ops.getLastTag(rootPath);
  const commits = await ops.getCommitsSinceTag(lastTag, rootPath);

  return commits.map((c) => ({
    hash: c.hash,
    message: c.message,
    author: c.author,
    date: new Date(c.date),
    files: c.files,
    packages: [],
  }));
}
