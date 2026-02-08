# plugin-gitlab

> `@bonvoy/plugin-gitlab` — Optional plugin

Creates GitLab releases and merge requests. Use this instead of (or alongside) the GitHub plugin.

## Installation

```bash
npm install -D @bonvoy/plugin-gitlab
```

## Configuration

```javascript
export default {
  gitlab: {
    host: 'https://gitlab.com',   // default
    projectId: 12345,             // required
    // token: process.env.GITLAB_TOKEN,  // default
  },
};
```

### `host`

GitLab instance URL. Change for self-hosted GitLab.

### `projectId`

Your GitLab project ID. Find it on the project's main page under the project name.

### `token`

GitLab personal access token or CI job token. Defaults to `GITLAB_TOKEN` environment variable.

## Hooks

| Hook | Action |
|------|--------|
| `makeRelease` | Creates a GitLab release for each published package |
| `createPR` | Creates a merge request (PR workflow) |

## GitLab CI

```yaml
release:
  stage: deploy
  script:
    - npm ci
    - npx bonvoy shipit
  variables:
    GITLAB_TOKEN: $CI_JOB_TOKEN
  only:
    - main
```
