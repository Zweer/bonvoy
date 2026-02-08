# Hooks Reference

Complete list of lifecycle hooks with their type signatures.

## Lifecycle Order

```
modifyConfig → beforeShipIt → getVersion → validateRepo →
version → afterVersion → beforeChangelog → generateChangelog →
afterChangelog → beforePublish → publish → afterPublish →
beforeRelease → makeRelease → afterRelease
```

For PR workflow:
```
modifyConfig → beforeShipIt → getVersion → validateRepo →
version → afterVersion → beforeChangelog → generateChangelog →
afterChangelog → beforeCreatePR → createPR → afterCreatePR
```

## Configuration Phase

### `modifyConfig`

- **Type:** `AsyncSeriesWaterfallHook<[BonvoyConfig]>`
- **Returns:** modified config

Allows plugins to modify the configuration before the release starts.

```typescript
bonvoy.hooks.modifyConfig.tap('my-plugin', (config) => {
  return { ...config, tagFormat: 'v{version}' };
});
```

## Validation Phase

### `beforeShipIt`

- **Type:** `AsyncSeriesHook<[Context]>`

Runs before the release process starts. Use for pre-flight checks or setup.

```typescript
bonvoy.hooks.beforeShipIt.tap('my-plugin', (context) => {
  console.log(`Starting release for ${context.packages.length} packages`);
});
```

### `validateRepo`

- **Type:** `AsyncSeriesHook<[Context]>`

Validate the repository state before making changes. The context includes calculated `versions` at this point. Throw an error to abort.

```typescript
bonvoy.hooks.validateRepo.tapPromise('my-plugin', async (context) => {
  // context.versions is available here
  for (const [name, version] of Object.entries(context.versions)) {
    if (await tagExists(`${name}@${version}`)) {
      throw new Error(`Tag ${name}@${version} already exists`);
    }
  }
});
```

## Version Phase

### `getVersion`

- **Type:** `AsyncSeriesWaterfallHook<[Context]>`
- **Returns:** `SemverBump` (`'major' | 'minor' | 'patch' | 'prerelease' | 'none'`)

Determine the version bump for the current package. Called once per package.

```typescript
bonvoy.hooks.getVersion.tap('my-plugin', (context) => {
  // context.currentPackage - the package being evaluated
  // context.commits - commits filtered for this package
  return 'minor';
});
```

### `version`

- **Type:** `AsyncSeriesHook<[VersionContext]>`

Called after all version bumps are calculated. `VersionContext` includes `versions` and `bumps` maps.

### `afterVersion`

- **Type:** `AsyncSeriesHook<[VersionContext]>`

Called after version hooks complete.

## Changelog Phase

### `beforeChangelog`

- **Type:** `AsyncSeriesHook<[ChangelogContext]>`

Called before changelog generation for each package.

### `generateChangelog`

- **Type:** `AsyncSeriesWaterfallHook<[ChangelogContext]>`
- **Returns:** `string` (changelog content)

Generate the changelog content for the current package.

```typescript
bonvoy.hooks.generateChangelog.tap('my-plugin', (context) => {
  // context.currentPackage - the package
  // context.commits - commits for this package
  // context.versions - all calculated versions
  return `## ${context.versions[context.currentPackage.name]}\n\n...`;
});
```

### `afterChangelog`

- **Type:** `AsyncSeriesHook<[ChangelogContext]>`

Called after changelog generation. The changelog plugin writes the file here.

## Publish Phase

### `beforePublish`

- **Type:** `AsyncSeriesHook<[PublishContext]>`

Called before publishing. The git plugin commits, tags, and pushes here.

### `publish`

- **Type:** `AsyncSeriesHook<[PublishContext]>`

Publish packages. The npm plugin publishes to the registry here.

### `afterPublish`

- **Type:** `AsyncSeriesHook<[PublishContext]>`

Called after publishing.

## Release Phase

### `beforeRelease`

- **Type:** `AsyncSeriesHook<[ReleaseContext]>`

Called before creating releases.

### `makeRelease`

- **Type:** `AsyncSeriesHook<[ReleaseContext]>`

Create releases. The GitHub/GitLab plugin creates releases here.

### `afterRelease`

- **Type:** `AsyncSeriesHook<[ReleaseContext]>`

Called after all releases are created. Notification plugins typically hook here.

## PR Workflow Phase

### `beforeCreatePR`

- **Type:** `AsyncSeriesHook<[PRContext]>`

Called before creating the release PR/MR.

### `createPR`

- **Type:** `AsyncSeriesHook<[PRContext]>`

Create the pull request or merge request.

### `afterCreatePR`

- **Type:** `AsyncSeriesHook<[PRContext]>`

Called after the PR is created. `PRContext` includes `prUrl` and `prNumber` at this point.

## Context Types

```typescript
interface Context {
  config: BonvoyConfig;
  packages: Package[];
  changedPackages: Package[];
  rootPath: string;
  isDryRun: boolean;
  logger: Logger;
  commits?: CommitInfo[];
  currentPackage?: Package;
  versions?: Record<string, string>;
}

interface VersionContext extends Context {
  versions: Record<string, string>;
  bumps: Record<string, string>;
}

interface ChangelogContext extends VersionContext {
  commits: CommitInfo[];
  changelogs: Record<string, string>;
}

interface PublishContext extends ChangelogContext {
  publishedPackages: string[];
  preid?: string;
}

interface ReleaseContext extends PublishContext {
  releases: Record<string, ReleaseInfo>;
}

interface PRContext extends Context {
  branchName: string;
  baseBranch: string;
  title: string;
  body: string;
  prUrl?: string;
  prNumber?: number;
}
```
