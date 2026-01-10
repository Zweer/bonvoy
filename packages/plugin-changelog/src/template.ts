import type { CommitInfo, Package } from '@bonvoy/core';

import type { ChangelogConfig } from './changelog.js';

interface GroupedCommits {
  [type: string]: CommitInfo[];
}

export function generateTemplate(
  commits: CommitInfo[],
  pkg: Package,
  config: ChangelogConfig,
): string {
  const grouped = groupCommitsByType(commits);
  const sections: string[] = [];

  // Add version header
  const date = new Date().toISOString().split('T')[0];
  sections.push(`## [${pkg.version}] - ${date}`);
  sections.push('');

  // Add sections for each commit type
  for (const [type, typeCommits] of Object.entries(grouped)) {
    const sectionTitle = config.sections?.[type] || `### ${type}`;
    sections.push(`### ${sectionTitle}`);
    sections.push('');

    for (const commit of typeCommits) {
      const line = formatCommitLine(commit, config);
      sections.push(`- ${line}`);
    }
    sections.push('');
  }

  return sections.join('\n').trim();
}

function groupCommitsByType(commits: CommitInfo[]): GroupedCommits {
  const grouped: GroupedCommits = {};

  for (const commit of commits) {
    const type = extractCommitType(commit.message);
    if (type) {
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(commit);
    }
  }

  // Sort by priority: breaking > feat > fix > perf > others
  const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
    const priority = { breaking: 0, feat: 1, fix: 2, perf: 3 };
    const aPriority = priority[a as keyof typeof priority] ?? 99;
    const bPriority = priority[b as keyof typeof priority] ?? 99;
    return aPriority - bPriority;
  });

  return Object.fromEntries(sortedEntries);
}

function extractCommitType(message: string): string | null {
  // Check for breaking changes first
  if (message.includes('BREAKING CHANGE') || message.includes('!:')) {
    return 'breaking';
  }

  // Extract type from conventional commit format
  const match = message.match(/^(\w+)(\(.+\))?!?:\s*(.+)$/);
  return match ? match[1] : null;
}

function formatCommitLine(commit: CommitInfo, config: ChangelogConfig): string {
  const message = commit.message;
  const shortHash = commit.hash.substring(0, 7);

  if (config.includeCommitHash) {
    return `${message} (${shortHash})`;
  }

  return message;
}
