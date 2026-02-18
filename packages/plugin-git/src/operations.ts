import { execa } from 'execa';

export interface GitOperations {
  add(files: string, cwd: string): Promise<void>;
  resetFile(file: string, cwd: string): Promise<void>;
  commit(message: string, cwd: string): Promise<void>;
  tag(name: string, cwd: string): Promise<void>;
  push(cwd: string, branch?: string): Promise<void>;
  pushTags(tags: string[], cwd: string): Promise<void>;
  checkout(branch: string, cwd: string, create?: boolean): Promise<void>;
  getCurrentBranch(cwd: string): Promise<string>;
  tagExists(name: string, cwd: string): Promise<boolean>;
  getCommitsSinceTag(
    tag: string | null,
    cwd: string,
  ): Promise<
    Array<{ hash: string; message: string; author: string; date: string; files: string[] }>
  >;
  getLastTag(cwd: string): Promise<string | null>;
  // Rollback operations
  getHeadSha(cwd: string): Promise<string>;
  resetHard(sha: string, cwd: string): Promise<void>;
  deleteTag(name: string, cwd: string): Promise<void>;
  deleteRemoteTags(tags: string[], cwd: string): Promise<void>;
  forcePush(cwd: string, branch: string): Promise<void>;
}

export const defaultGitOperations: GitOperations = {
  async add(files, cwd) {
    await execa('git', ['add', files], { cwd });
  },

  async resetFile(file, cwd) {
    try {
      await execa('git', ['reset', 'HEAD', file], { cwd });
    } catch {
      // File not staged (already gitignored or doesn't exist) — ignore
    }
  },

  async commit(message, cwd) {
    await execa('git', ['commit', '-m', message], { cwd });
  },

  async tag(name, cwd) {
    await execa('git', ['tag', name], { cwd });
  },

  /* c8 ignore start - real git operations */
  async push(cwd, branch?) {
    if (branch) {
      await execa('git', ['push', '-u', 'origin', branch], { cwd });
    } else {
      await execa('git', ['push'], { cwd });
    }
  },

  async pushTags(tags, cwd) {
    await execa('git', ['push', 'origin', ...tags], { cwd });
  },

  async checkout(branch, cwd, create = false) {
    const args = create ? ['checkout', '-b', branch] : ['checkout', branch];
    await execa('git', args, { cwd });
  },

  async getCurrentBranch(cwd) {
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
    return stdout.trim();
  },

  async tagExists(name, cwd) {
    try {
      await execa('git', ['rev-parse', `refs/tags/${name}`], { cwd });
      return true;
    } catch {
      return false;
    }
  },
  /* c8 ignore stop */

  async getLastTag(cwd) {
    try {
      const { stdout } = await execa('git', ['describe', '--tags', '--abbrev=0'], { cwd });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  },

  async getCommitsSinceTag(tag, cwd) {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const { stdout } = await execa(
      'git',
      ['log', '--pretty=format:%H|%s|%an|%aI', '--name-only', range],
      { cwd },
    );

    if (!stdout.trim()) return [];

    const commits: Array<{
      hash: string;
      message: string;
      author: string;
      date: string;
      files: string[];
    }> = [];
    const entries = stdout.split('\n\n');

    for (const entry of entries) {
      const lines = entry.split('\n');
      const [firstLine, ...fileLines] = lines;
      const [hash, message, author, date] = firstLine.split('|');
      if (hash && message) {
        commits.push({
          hash,
          message,
          author: author || '',
          date: date || '',
          files: fileLines.filter((f) => f.trim()),
        });
      }
    }

    return commits;
  },

  /* c8 ignore start - real git operations */
  async getHeadSha(cwd) {
    const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd });
    return stdout.trim();
  },

  async resetHard(sha, cwd) {
    await execa('git', ['reset', '--hard', sha], { cwd });
  },

  async deleteTag(name, cwd) {
    await execa('git', ['tag', '-d', name], { cwd });
  },

  async deleteRemoteTags(tags, cwd) {
    for (const tag of tags) {
      await execa('git', ['push', '--delete', 'origin', tag], { cwd });
    }
  },

  async forcePush(cwd, branch) {
    await execa('git', ['push', '--force-with-lease', 'origin', branch], { cwd });
  },
  /* c8 ignore stop */
};
