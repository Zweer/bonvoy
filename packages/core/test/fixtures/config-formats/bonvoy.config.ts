import type { BonvoyConfig } from '../../../src/schema.js';

const config: BonvoyConfig = {
  versioning: 'independent',
  commitMessage: 'chore: release {packages}',
  tagFormat: '{name}@{version}',
  changelog: {
    sections: {
      feat: '✨ Features',
      fix: '🐛 Bug Fixes',
    },
  },
};

export default config;
