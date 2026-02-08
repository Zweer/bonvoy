---
layout: home

hero:
  name: bonvoy
  text: Bon voyage to your releases!
  tagline: A plugin-based release automation tool for npm packages and monorepos.
  image:
    src: /logo.svg
    alt: bonvoy
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Zweer/bonvoy

features:
  - icon: 🔌
    title: Plugin Architecture
    details: Core is an event bus — everything else is a plugin. Extend or replace any functionality.
  - icon: 📦
    title: Monorepo-Native
    details: npm workspaces out of the box. Independent or fixed versioning per package.
  - icon: ⚡
    title: Zero Config
    details: Works immediately for npm + GitHub projects. No config file needed.
  - icon: 📝
    title: Conventional Commits
    details: Automatic version bumps and changelogs from your commit messages.
  - icon: 🎯
    title: Flexible Workflows
    details: Direct release with one command, or PR-based workflow like release-please.
  - icon: 🛡️
    title: Pre-release Validation
    details: Checks tags, npm versions, and GitHub releases before making any changes.
---

## Why bonvoy?

| Tool | Problem |
|------|---------|
| semantic-release | Too automatic, complex plugin config |
| release-it | No monorepo support (wontfix) |
| changesets | Mandatory PR workflow, unpredictable bumps |
| release-please | Complex config, PR-only workflow |
| auto | Label-based, PR-dependent |

bonvoy gives you the best of all worlds: **simple by default, powerful when you need it**.

```bash
npm install -D @bonvoy/core
npx bonvoy shipit
```
