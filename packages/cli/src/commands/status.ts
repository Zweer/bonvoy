import { inc } from 'semver';

import { analyzeStatus } from '../utils/analyze.js';

export async function statusCommand(): Promise<void> {
  try {
    const { packages, changedPackages, commits } = await analyzeStatus({});

    if (changedPackages.length === 0) {
      console.log('✅ No pending changes');
      return;
    }

    console.log(`📦 ${changedPackages.length} package(s) with pending changes:\n`);

    for (const { pkg, bump } of changedPackages) {
      const newVersion = inc(pkg.version, bump as 'major' | 'minor' | 'patch') ?? bump;
      const commitCount = commits.filter((c) => c.packages.includes(pkg.name)).length;
      console.log(
        `  ${pkg.name}: ${pkg.version} → ${newVersion} (${bump}, ${commitCount} commit${commitCount !== 1 ? 's' : ''})`,
      );
    }

    console.log(`\n📝 ${commits.length} commit(s) since last release`);
    console.log(`📊 ${packages.length} total package(s) in workspace`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
