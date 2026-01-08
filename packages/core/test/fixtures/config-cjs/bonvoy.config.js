module.exports = {
  versioning: 'independent',
  commitMessage: 'cjs: release {packages}',
  tagFormat: '{name}@{version}',
  changelog: {
    sections: {
      feat: '📦 CJS Features',
      fix: '🛠️ CJS Fixes',
    },
  },
};
