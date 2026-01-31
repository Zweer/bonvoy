import { execa } from 'execa';

export interface NpmOperations {
  publish(args: string[], cwd: string): Promise<void>;
  view(pkg: string, version: string): Promise<string | null>;
}

export const defaultNpmOperations: NpmOperations = {
  async publish(args, cwd) {
    await execa('npm', ['publish', ...args], { cwd, stdio: 'inherit' });
  },

  async view(pkg, version) {
    try {
      const result = await execa('npm', ['view', `${pkg}@${version}`, 'version'], {
        stdio: 'pipe',
      });
      return result.stdout.trim() || null;
    } catch {
      return null;
    }
  },
};
