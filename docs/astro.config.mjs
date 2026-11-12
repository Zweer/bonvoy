// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://zweer.github.io/bonvoy',
  base: '/bonvoy/',
  integrations: [
    starlight({
      title: 'bonvoy',
      description: 'A plugin-based release automation tool for npm packages and monorepos',
      logo: {
        src: './public/logo.svg',
        alt: 'bonvoy',
      },
      favicon: '/favicon.ico',
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/png',
            sizes: '32x32',
            href: '/bonvoy/favicon-32x32.png',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            sizes: '180x180',
            href: '/bonvoy/apple-touch-icon.png',
          },
        },
      ],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Zweer/bonvoy' }],
      editLink: {
        baseUrl: 'https://github.com/Zweer/bonvoy/edit/main/docs/',
      },
      sidebar: [
        {
          label: 'Guide',
          items: [
            { label: 'Getting Started', slug: 'getting-started' },
            { label: 'Configuration', slug: 'configuration' },
            { label: 'CLI', slug: 'cli' },
            { label: 'Comparison', slug: 'comparison' },
            { label: 'FAQ', slug: 'faq' },
          ],
        },
        {
          label: 'Plugins',
          items: [
            { label: 'Overview', slug: 'plugins/overview' },
            { label: 'Conventional Commits', slug: 'plugins/conventional' },
            { label: 'Changelog', slug: 'plugins/changelog' },
            { label: 'Git', slug: 'plugins/git' },
            { label: 'npm', slug: 'plugins/npm' },
            { label: 'GitHub', slug: 'plugins/github' },
            { label: 'GitLab', slug: 'plugins/gitlab' },
            { label: 'Changeset', slug: 'plugins/changeset' },
            { label: 'Exec', slug: 'plugins/exec' },
            { label: 'AI Release Notes', slug: 'plugins/ai' },
            { label: 'Notifications', slug: 'plugins/notifications' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Monorepo', slug: 'guides/monorepo' },
            { label: 'Single Package', slug: 'guides/single-package' },
            { label: 'PR Workflow', slug: 'guides/pr-workflow' },
            { label: 'CI/CD', slug: 'guides/ci-cd' },
            { label: 'Rollback & Recovery', slug: 'guides/rollback' },
            { label: 'Migration', slug: 'guides/migration' },
            { label: 'Writing Plugins', slug: 'guides/writing-plugins' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Hooks', slug: 'reference/hooks' },
            { label: 'API', slug: 'reference/api' },
          ],
        },
        {
          label: 'Blog',
          items: [{ label: 'Why I Built bonvoy', slug: 'blog/why-i-built-bonvoy' }],
        },
      ],
    }),
  ],
});
