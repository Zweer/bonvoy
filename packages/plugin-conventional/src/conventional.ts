import type { BonvoyPlugin, CommitInfo, Context, SemverBump } from '@bonvoy/core';
// @ts-expect-error - v5 types are not accurate
import { sync as parseCommit } from 'conventional-commits-parser';

export interface ConventionalConfig {
  preset?: 'angular' | 'conventional' | 'atom' | 'custom';
  types?: Record<string, SemverBump>;
}

interface ParsedCommit {
  type: string;
  scope?: string;
  subject: string;
  header: string;
  notes?: Array<{ title: string; text: string }>;
}

const PRESETS: Record<string, { types: Record<string, SemverBump> }> = {
  angular: {
    types: {
      feat: 'minor',
      fix: 'patch',
      perf: 'patch',
    },
  },
  conventional: {
    types: {
      feat: 'minor',
      fix: 'patch',
      perf: 'patch',
    },
  },
  atom: {
    types: {
      ':sparkles:': 'minor',
      ':bug:': 'patch',
      ':racehorse:': 'patch',
    },
  },
};

export default class ConventionalPlugin implements BonvoyPlugin {
  name = 'conventional';
  private config: ConventionalConfig;

  constructor(config: ConventionalConfig = {}) {
    this.config = { preset: 'angular', ...config };
  }

  apply(bonvoy: {
    hooks: { getVersion: { tap: (name: string, fn: (context: Context) => SemverBump) => void } };
  }): void {
    bonvoy.hooks.getVersion.tap(this.name, (context: Context) => {
      return this.getVersionBump(context) || 'none';
    });
  }

  private getVersionBump(context: Context & { commits?: CommitInfo[] }): SemverBump | null {
    const commits = context.commits || [];

    if (commits.length === 0) return null;

    let maxBump: SemverBump | null = null;

    for (const commit of commits) {
      const parsed = this.parseCommit(commit.message);
      if (!parsed) continue;

      const bump = this.getBumpForCommit(parsed);
      if (bump) {
        maxBump = this.getMaxBump(maxBump, bump);
      }
    }

    return maxBump;
  }

  private parseCommit(message: string): ParsedCommit | null {
    try {
      // Check for ! breaking change syntax first
      const breakingMatch = message.match(/^(\w+)(\(.+\))?!:\s*(.+)$/);
      if (breakingMatch) {
        const [, type, scope, subject] = breakingMatch;
        return {
          type,
          scope: scope ? scope.slice(1, -1) : undefined,
          subject,
          header: message,
          notes: [{ title: 'BREAKING CHANGE', text: 'Breaking change detected' }],
        };
      }

      // Use conventional-commits-parser for normal commits
      const parsed = parseCommit(message);
      if (!parsed.type) return null;

      return {
        type: parsed.type,
        scope: parsed.scope || undefined,
        subject: parsed.subject || '',
        // v8 ignore next -- @preserve
        header: parsed.header || message,
        // v8 ignore next -- @preserve
        notes: parsed.notes || [],
      };
    } catch {
      return null;
    }
  }

  private getBumpForCommit(parsed: ParsedCommit): SemverBump | null {
    // Check for breaking changes
    if (parsed.notes?.some((note) => note.title === 'BREAKING CHANGE')) {
      return 'major';
    }

    const config = this.getParserConfig();
    const type = parsed.type;

    return config.types[type] || null;
  }

  private getParserConfig(): { types: Record<string, SemverBump> } {
    if (this.config.preset === 'custom' && this.config.types) {
      return { types: this.config.types };
    }

    const preset = this.config.preset || 'angular';
    return PRESETS[preset];
  }

  private getMaxBump(current: SemverBump | null, candidate: SemverBump): SemverBump {
    if (!current) return candidate;

    const order: Record<SemverBump, number> = {
      major: 4,
      minor: 3,
      patch: 2,
      prerelease: 1,
      none: 0,
    };
    return order[candidate] > order[current] ? candidate : current;
  }
}
