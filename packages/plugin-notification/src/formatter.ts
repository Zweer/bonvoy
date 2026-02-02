import type { ReleaseContext } from '@bonvoy/core';

import type { NotificationConfig, NotificationMessage, NotificationPackage } from './types.js';

const DEFAULT_TITLE_TEMPLATE = '🚀 Released {count} package(s)';

export function formatMessage(
  context: ReleaseContext,
  config: NotificationConfig,
): NotificationMessage {
  const { changedPackages, versions, changelogs } = context;
  const maxLen = config.maxChangelogLength ?? 500;

  const packages: NotificationPackage[] = changedPackages.map((pkg) => {
    const version = versions[pkg.name];
    let changelog = changelogs?.[pkg.name];

    if (changelog && changelog.length > maxLen) {
      changelog = `${changelog.slice(0, maxLen)}...`;
    }

    return {
      name: pkg.name,
      version,
      changelog: config.includeChangelog !== false ? changelog : undefined,
      npmUrl:
        config.includeLinks !== false ? `https://www.npmjs.com/package/${pkg.name}` : undefined,
      githubUrl: undefined, // Set by specific plugins if needed
    };
  });

  const title = (config.titleTemplate ?? DEFAULT_TITLE_TEMPLATE)
    .replace('{count}', String(packages.length))
    .replace('{packages}', packages.map((p) => `${p.name}@${p.version}`).join(', '));

  return {
    title,
    packages,
    isSuccess: true,
    timestamp: new Date(),
  };
}

export function formatPackageList(packages: NotificationPackage[]): string {
  return packages.map((p) => `• ${p.name}@${p.version}`).join('\n');
}

export function formatChangelog(packages: NotificationPackage[]): string {
  return packages
    .filter((p) => p.changelog)
    .map((p) => `**${p.name}@${p.version}**\n${p.changelog}`)
    .join('\n\n');
}
