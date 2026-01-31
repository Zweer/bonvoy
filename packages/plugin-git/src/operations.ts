import { execa } from 'execa';

export interface GitOperations {
  add(files: string, cwd: string): Promise<void>;
  commit(message: string, cwd: string): Promise<void>;
  tag(name: string, cwd: string): Promise<void>;
  push(cwd: string): Promise<void>;
  pushTags(tags: string[], cwd: string): Promise<void>;
  getCommitsSinceTag(
    tag: string | null,
    cwd: string,
  ): Promise<
    Array<{ hash: string; message: string; author: string; date: string; files: string[] }>
  >;
  getLastTag(cwd: string): Promise<string | null>;
}

export const defaultGitOperations: GitOperations = {
  async add(files, cwd) {
    await execa('git', ['add', files], { cwd });
  },

  async commit(message, cwd) {
    await execa('git', ['commit', '-m', message], { cwd });
  },

  async tag(name, cwd) {
    await execa('git', ['tag', name], { cwd });
  },

  async push(cwd) {
    await execa('git', ['push'], { cwd });
  },

  async pushTags(tags, cwd) {
    await execa('git', ['push', 'origin', ...tags], { cwd });
  },

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
};
