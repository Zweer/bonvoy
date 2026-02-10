import type { CommitInfo } from '@bonvoy/core';

const DEFAULT_PROMPT = `You are a release notes writer. Given a list of commits for a software package, write a 2-3 sentence summary of what changed in this release.

Be concise and specific. Focus on what matters to users, not implementation details.
Do not use bullet points. Do not repeat commit messages verbatim.
Write in present tense ("adds", "fixes", "improves").

Package: {packageName}
Version: {version}

Commits:
{commitList}`;

const MAX_COMMITS = 50;

export function buildPrompt(
  commits: CommitInfo[],
  packageName: string,
  version: string,
  template?: string,
): string {
  const truncated = commits.slice(0, MAX_COMMITS);
  const commitList = truncated.map((c) => `- ${c.message}`).join('\n');

  return (template ?? DEFAULT_PROMPT)
    .replace('{packageName}', packageName)
    .replace('{version}', version)
    .replace('{commitList}', commitList);
}

export function insertSummary(changelog: string, summary: string): string {
  const blockquote = summary
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  // Insert after the first line (version header)
  const firstNewline = changelog.indexOf('\n');
  if (firstNewline === -1) {
    return `${changelog}\n\n${blockquote}`;
  }

  const header = changelog.slice(0, firstNewline);
  const rest = changelog.slice(firstNewline + 1);
  return `${header}\n\n${blockquote}\n${rest}`;
}
