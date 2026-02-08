import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'bonvoy',
  description: 'A plugin-based release automation tool for npm packages and monorepos',
  base: '/bonvoy/',
  head: [['link', { rel: 'icon', href: '/bonvoy/favicon.ico' }]],

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Plugins', link: '/plugins/overview' },
      { text: 'Reference', link: '/reference/hooks' },
      {
        text: 'Links',
        items: [
          { text: 'npm', link: 'https://www.npmjs.com/org/bonvoy' },
          { text: 'Changelog', link: 'https://github.com/Zweer/bonvoy/blob/main/CHANGELOG.md' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'CLI', link: '/cli' },
          { text: 'Comparison', link: '/comparison' },
          { text: 'FAQ', link: '/faq' },
        ],
      },
      {
        text: 'Plugins',
        items: [
          { text: 'Overview', link: '/plugins/overview' },
          { text: 'Conventional Commits', link: '/plugins/conventional' },
          { text: 'Changelog', link: '/plugins/changelog' },
          { text: 'Git', link: '/plugins/git' },
          { text: 'npm', link: '/plugins/npm' },
          { text: 'GitHub', link: '/plugins/github' },
          { text: 'GitLab', link: '/plugins/gitlab' },
          { text: 'Changeset', link: '/plugins/changeset' },
          { text: 'Exec', link: '/plugins/exec' },
          { text: 'Notifications', link: '/plugins/notifications' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Monorepo', link: '/guides/monorepo' },
          { text: 'Single Package', link: '/guides/single-package' },
          { text: 'PR Workflow', link: '/guides/pr-workflow' },
          { text: 'CI/CD', link: '/guides/ci-cd' },
          { text: 'Migration', link: '/guides/migration' },
          { text: 'Writing Plugins', link: '/guides/writing-plugins' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Hooks', link: '/reference/hooks' },
          { text: 'API', link: '/reference/api' },
        ],
      },
      {
        text: 'Blog',
        items: [
          { text: 'Why I Built bonvoy', link: '/blog/why-i-built-bonvoy' },
          { text: 'Zero-Config Monorepo Releases', link: '/blog/zero-config-monorepo-releases' },
          { text: 'Migrating from Changesets', link: '/blog/migrating-from-changesets' },
          { text: 'Plugin System with Tapable', link: '/blog/plugin-system-with-tapable' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/Zweer/bonvoy' }],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/Zweer/bonvoy/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Zweer',
    },
  },
});
