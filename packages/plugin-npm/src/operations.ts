import { execa } from 'execa';

export interface NpmOperations {
  publish(args: string[], cwd: string): Promise<void>;
  view(pkg: string, version: string): Promise<string | null>;
  packageExists(pkg: string): Promise<boolean>;
  hasToken(): Promise<boolean>;
  unpublish(pkg: string, version: string): Promise<void>;
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

  /* c8 ignore start - real npm operations */
  async packageExists(pkg) {
    try {
      await execa('npm', ['view', pkg, 'name'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  },

  async hasToken() {
    return !!process.env.NPM_TOKEN || !!process.env.NODE_AUTH_TOKEN;
  },

  async unpublish(pkg, version) {
    await execa('npm', ['unpublish', `${pkg}@${version}`], { stdio: 'pipe' });
  },
  /* c8 ignore stop */
};
