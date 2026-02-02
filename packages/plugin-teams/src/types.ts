import type { NotificationConfig, NotificationMessage } from '@bonvoy/plugin-notification';

export interface TeamsConfig extends NotificationConfig {
  /** Teams webhook URL (required) */
  webhookUrl: string;
}

export interface TeamsCard {
  '@type': 'MessageCard';
  '@context': string;
  themeColor: string;
  summary: string;
  sections: TeamsSection[];
}

export interface TeamsSection {
  activityTitle?: string;
  facts?: Array<{ name: string; value: string }>;
  text?: string;
}

const SUCCESS_COLOR = '57F287';
const FAILURE_COLOR = 'ED4245';

export function buildTeamsCard(message: NotificationMessage): TeamsCard {
  const sections: TeamsSection[] = [{ activityTitle: message.title }];

  if (message.packages.length > 0) {
    sections.push({
      facts: message.packages.map((p) => {
        const links = [];
        if (p.npmUrl) links.push(`[npm](${p.npmUrl})`);
        if (p.githubUrl) links.push(`[release](${p.githubUrl})`);
        return {
          name: `${p.name}@${p.version}`,
          value: links.join(' | ') || '-',
        };
      }),
    });
  }

  for (const pkg of message.packages) {
    if (pkg.changelog) {
      sections.push({ activityTitle: pkg.name, text: pkg.changelog });
    }
  }

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: message.isSuccess ? SUCCESS_COLOR : FAILURE_COLOR,
    summary: message.title,
    sections,
  };
}
