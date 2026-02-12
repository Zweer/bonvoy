import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE_URL = 'https://zweer.github.io/bonvoy';
const DOCS_DIR = resolve(import.meta.dirname, '../docs');
const OUT_DIR = resolve(DOCS_DIR, 'public');

// Sidebar structure — mirrors docs/.vitepress/config.ts
// Each page has a description for llms.txt (human-readable summary)
const sidebar: Array<{
  section: string;
  pages: Array<{ text: string; link: string; desc: string }>;
}> = [
  {
    section: 'Guide',
    pages: [
      {
        text: 'Getting Started',
        link: '/getting-started',
        desc: 'Install and first release in 2 minutes',
      },
      { text: 'Configuration', link: '/configuration', desc: 'All config options with examples' },
      { text: 'CLI', link: '/cli', desc: 'Commands: shipit, prepare, rollback, status, changelog' },
      {
        text: 'Comparison',
        link: '/comparison',
        desc: 'Feature matrix vs changesets, semantic-release, release-it, release-please',
      },
      { text: 'FAQ', link: '/faq', desc: 'Common questions and troubleshooting' },
    ],
  },
  {
    section: 'Plugins',
    pages: [
      {
        text: 'Overview',
        link: '/plugins/overview',
        desc: 'Plugin system architecture, hooks, and lifecycle',
      },
      {
        text: 'Conventional Commits',
        link: '/plugins/conventional',
        desc: 'Parse conventional commits for automatic version bumps',
      },
      { text: 'Changelog', link: '/plugins/changelog', desc: 'Generate CHANGELOG.md per package' },
      { text: 'Git', link: '/plugins/git', desc: 'Commit, tag, push with rollback support' },
      { text: 'npm', link: '/plugins/npm', desc: 'Publish to npm with OIDC authentication' },
      { text: 'GitHub', link: '/plugins/github', desc: 'Create GitHub releases and PRs' },
      {
        text: 'GitLab',
        link: '/plugins/gitlab',
        desc: 'Create GitLab releases and merge requests',
      },
      {
        text: 'Changeset',
        link: '/plugins/changeset',
        desc: 'Changeset-compatible workflow with .changeset/ files',
      },
      {
        text: 'Exec',
        link: '/plugins/exec',
        desc: 'Run custom shell commands at any lifecycle hook',
      },
      {
        text: 'AI Release Notes',
        link: '/plugins/ai',
        desc: 'AI-generated release summary via OpenAI, Anthropic, or Gemini',
      },
      {
        text: 'Notifications',
        link: '/plugins/notifications',
        desc: 'Slack, Discord, Telegram, Teams notifications',
      },
    ],
  },
  {
    section: 'Guides',
    pages: [
      {
        text: 'Monorepo',
        link: '/guides/monorepo',
        desc: 'npm workspaces setup with independent versioning',
      },
      {
        text: 'Single Package',
        link: '/guides/single-package',
        desc: 'Setup for single-package repositories',
      },
      {
        text: 'PR Workflow',
        link: '/guides/pr-workflow',
        desc: 'Release-please style PR-based releases',
      },
      { text: 'CI/CD', link: '/guides/ci-cd', desc: 'GitHub Actions and GitLab CI setup' },
      {
        text: 'Rollback & Recovery',
        link: '/guides/rollback',
        desc: 'Automatic and manual rollback of failed releases',
      },
      {
        text: 'Migration',
        link: '/guides/migration',
        desc: 'Migrate from changesets, semantic-release, release-it',
      },
      {
        text: 'Writing Plugins',
        link: '/guides/writing-plugins',
        desc: 'How to create custom bonvoy plugins',
      },
    ],
  },
  {
    section: 'Reference',
    pages: [
      {
        text: 'Hooks',
        link: '/reference/hooks',
        desc: 'All lifecycle hooks with TypeScript signatures',
      },
      { text: 'API', link: '/reference/api', desc: 'Programmatic API for @bonvoy/core' },
    ],
  },
];

// --- llms.txt ---
const llmsTxt = [
  '# bonvoy',
  '',
  '> Plugin-based release automation tool for npm packages and monorepos.',
  '',
  ...sidebar.flatMap(({ section, pages }) => [
    `## ${section}`,
    '',
    ...pages.map((p) => `- [${p.text}](${SITE_URL}${p.link}): ${p.desc}`),
    '',
  ]),
].join('\n');

writeFileSync(resolve(OUT_DIR, 'llms.txt'), llmsTxt);
console.log('✅ Generated: docs/public/llms.txt');

// --- llms-full.txt ---
const allPages = sidebar.flatMap(({ pages }) => pages);
const fullParts: string[] = [
  '# bonvoy\n\n> Plugin-based release automation tool for npm packages and monorepos.\n',
];

for (const page of allPages) {
  const filePath = resolve(DOCS_DIR, `${page.link.slice(1)}.md`);
  const content = readFileSync(filePath, 'utf-8')
    // Strip VitePress frontmatter
    .replace(/^---\n[\s\S]*?\n---\n/, '');
  fullParts.push(`\n---\n\n${content.trim()}\n`);
}

writeFileSync(resolve(OUT_DIR, 'llms-full.txt'), fullParts.join('\n'));
console.log('✅ Generated: docs/public/llms-full.txt');
