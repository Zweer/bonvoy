import type { NotificationConfig, NotificationMessage } from '@bonvoy/plugin-notification';

export interface SlackConfig extends NotificationConfig {
  /** Slack Bot Token (xoxb-...) - use with channel */
  token?: string;
  /** Slack webhook URL - alternative to token */
  webhookUrl?: string;
  /** Channel to post to (required with token, optional with webhook) */
  channel?: string;
  /** Username for the bot (optional) */
  username?: string;
  /** Icon emoji for the bot (optional) */
  iconEmoji?: string;
  /** Mention users/groups (e.g., ['@here', '<@U123>']) */
  mentions?: string[];
}

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text?: string; url?: string }>;
  fields?: Array<{ type: string; text: string }>;
}

export interface SlackPayload {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  blocks: SlackBlock[];
}

export function buildSlackPayload(message: NotificationMessage, config: SlackConfig): SlackPayload {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: message.title, emoji: true },
    },
  ];

  if (config.mentions?.length) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: config.mentions.join(' ') },
    });
  }

  if (message.packages.length > 0) {
    const packageText = message.packages
      .map((p) => {
        const links = [];
        if (p.npmUrl) links.push(`<${p.npmUrl}|npm>`);
        if (p.githubUrl) links.push(`<${p.githubUrl}|release>`);
        const linkStr = links.length ? ` (${links.join(' | ')})` : '';
        return `• *${p.name}@${p.version}*${linkStr}`;
      })
      .join('\n');

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: packageText },
    });
  }

  for (const pkg of message.packages) {
    if (pkg.changelog) {
      blocks.push({ type: 'divider' } as SlackBlock, {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${pkg.name}*\n${pkg.changelog}` },
      });
    }
  }

  return {
    text: message.title,
    channel: config.channel,
    username: config.username,
    icon_emoji: config.iconEmoji,
    blocks,
  };
}
