import type { BonvoyConfig } from '@bonvoy/core';

export default {
  versioning: 'independent',
  commitMessage: 'chore: :bookmark: release {packages}',
  tagFormat: '{name}@{version}',
  baseBranch: 'main',
  changelog: {
    global: true,
    sections: {
      feat: '✨ Features',
      fix: '🐛 Bug Fixes',
      perf: '⚡ Performance',
      docs: '📚 Documentation',
      breaking: '💥 Breaking Changes',
    },
  },
} satisfies BonvoyConfig;
