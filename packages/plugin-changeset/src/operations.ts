import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import matter from 'gray-matter';

export interface ChangesetFile {
  path: string;
  packages: Record<string, string>; // package -> bump or version
  notes: string;
}

export interface ChangesetOperations {
  readDir(dir: string): string[];
  readFile(path: string): string;
  removeFile(path: string): void;
  exists(path: string): boolean;
}

export const defaultChangesetOperations: ChangesetOperations = {
  readDir(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((f) => f.endsWith('.md'));
  },
  readFile(path: string): string {
    return readFileSync(path, 'utf-8');
  },
  removeFile(path: string): void {
    rmSync(path);
  },
  exists(path: string): boolean {
    return existsSync(path);
  },
};

export function parseChangesetFile(content: string): {
  packages: Record<string, string>;
  notes: string;
} {
  const { data, content: notes } = matter(content);
  return { packages: data as Record<string, string>, notes: notes.trim() };
}

export function readChangesetFiles(rootPath: string, ops: ChangesetOperations): ChangesetFile[] {
  const files: ChangesetFile[] = [];
  const dirs = [join(rootPath, '.changeset'), join(rootPath, '.bonvoy')];

  for (const dir of dirs) {
    const mdFiles = ops.readDir(dir);
    for (const file of mdFiles) {
      if (file === 'README.md') continue; // changeset adds a README
      const filePath = join(dir, file);
      const content = ops.readFile(filePath);
      const { packages, notes } = parseChangesetFile(content);
      if (Object.keys(packages).length > 0) {
        files.push({ path: filePath, packages, notes });
      }
    }
  }

  return files;
}

export type BumpType = 'major' | 'minor' | 'patch';

const BUMP_ORDER: Record<BumpType, number> = { major: 3, minor: 2, patch: 1 };

export function isBumpType(value: string): value is BumpType {
  return value === 'major' || value === 'minor' || value === 'patch';
}

export function mergeChangesets(
  files: ChangesetFile[],
): Map<string, { bump: string; notes: string[] }> {
  const merged = new Map<string, { bump: string; notes: string[] }>();

  for (const file of files) {
    for (const [pkg, bumpOrVersion] of Object.entries(file.packages)) {
      const existing = merged.get(pkg);

      if (!existing) {
        merged.set(pkg, { bump: bumpOrVersion, notes: file.notes ? [file.notes] : [] });
      } else {
        // Merge bump: take highest if both are bump types, otherwise explicit version wins
        if (isBumpType(bumpOrVersion) && isBumpType(existing.bump)) {
          if (BUMP_ORDER[bumpOrVersion] > BUMP_ORDER[existing.bump]) {
            existing.bump = bumpOrVersion;
          }
        } else if (!isBumpType(bumpOrVersion)) {
          // Explicit version always wins
          existing.bump = bumpOrVersion;
        }

        // Merge notes
        if (file.notes) {
          existing.notes.push(file.notes);
        }
      }
    }
  }

  return merged;
}

export function deleteChangesetFiles(files: ChangesetFile[], ops: ChangesetOperations): void {
  for (const file of files) {
    ops.removeFile(file.path);
  }
}
