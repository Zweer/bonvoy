import type { ReleaseContext } from '@bonvoy/core';

export interface NotificationConfig {
  /** Send notification on successful release (default: true) */
  onSuccess?: boolean;
  /** Send notification on failed release (default: false) */
  onFailure?: boolean;
  /** Include changelog in message (default: true) */
  includeChangelog?: boolean;
  /** Include package list in message (default: true) */
  includePackages?: boolean;
  /** Include links to npm/GitHub (default: true) */
  includeLinks?: boolean;
  /** Max changelog length per package (default: 500) */
  maxChangelogLength?: number;
  /** Custom title template with placeholders: {count}, {packages} */
  titleTemplate?: string;
}

export interface NotificationPackage {
  name: string;
  version: string;
  changelog?: string;
  npmUrl?: string;
  githubUrl?: string;
}

export interface NotificationMessage {
  title: string;
  packages: NotificationPackage[];
  isSuccess: boolean;
  timestamp: Date;
}

export interface NotificationContext extends ReleaseContext {
  notificationMessage: NotificationMessage;
}
