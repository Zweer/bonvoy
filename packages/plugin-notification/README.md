# @bonvoy/plugin-notification

Base notification plugin for bonvoy. Provides common functionality for all notification plugins.

## Usage

This package is not meant to be used directly. Instead, use one of the notification plugins:

- `@bonvoy/plugin-slack` - Slack notifications
- `@bonvoy/plugin-discord` - Discord notifications
- `@bonvoy/plugin-telegram` - Telegram notifications
- `@bonvoy/plugin-teams` - Microsoft Teams notifications

## Creating a Custom Notification Plugin

```typescript
import { NotificationPlugin, NotificationMessage } from '@bonvoy/plugin-notification';

class MyNotificationPlugin extends NotificationPlugin {
  name = 'my-notification';
  
  constructor(private webhookUrl: string, config = {}) {
    super(config);
  }

  protected async send(message: NotificationMessage): Promise<void> {
    await fetch(this.webhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        title: message.title,
        packages: message.packages,
      }),
    });
  }
}
```

## Configuration

All notification plugins share these options:

```typescript
interface NotificationConfig {
  // When to send
  onSuccess?: boolean;      // Send on successful release (default: true)
  onFailure?: boolean;      // Send on failed release (default: false)
  
  // What to include
  includeChangelog?: boolean;   // Include changelog (default: true)
  includePackages?: boolean;    // Include package list (default: true)
  includeLinks?: boolean;       // Include npm/GitHub links (default: true)
  maxChangelogLength?: number;  // Truncate changelog (default: 500)
  
  // Customization
  titleTemplate?: string;   // Title with placeholders: {count}, {packages}
}
```

## Message Format

The `NotificationMessage` object passed to `send()`:

```typescript
interface NotificationMessage {
  title: string;           // Formatted title
  packages: Array<{
    name: string;          // Package name
    version: string;       // New version
    changelog?: string;    // Changelog for this release
    npmUrl?: string;       // Link to npm
    githubUrl?: string;    // Link to GitHub release
  }>;
  isSuccess: boolean;      // Whether release succeeded
  timestamp: Date;         // When the release happened
}
```

## Utilities

Helper functions for formatting:

```typescript
import { formatPackageList, formatChangelog } from '@bonvoy/plugin-notification';

// Format as bullet list
formatPackageList(packages);
// • @scope/core@1.0.0
// • @scope/cli@2.0.0

// Format changelogs
formatChangelog(packages);
// **@scope/core@1.0.0**
// - feat: new feature
```
