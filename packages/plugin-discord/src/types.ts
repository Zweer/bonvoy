import type { NotificationConfig, NotificationMessage } from '@bonvoy/plugin-notification';

export interface DiscordConfig extends NotificationConfig {
  /** Discord webhook URL (required) */
  webhookUrl: string;
  /** Username for the bot (optional) */
  username?: string;
  /** Avatar URL for the bot (optional) */
  avatarUrl?: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
}

export interface DiscordPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

const SUCCESS_COLOR = 0x57f287; // Green
const FAILURE_COLOR = 0xed4245; // Red

export function buildDiscordPayload(
  message: NotificationMessage,
  config: DiscordConfig,
): DiscordPayload {
  const embeds: DiscordEmbed[] = [
    {
      title: message.title,
      color: message.isSuccess ? SUCCESS_COLOR : FAILURE_COLOR,
      description: message.packages
        .map((p) => {
          const links = [];
          if (p.npmUrl) links.push(`[npm](${p.npmUrl})`);
          if (p.githubUrl) links.push(`[release](${p.githubUrl})`);
          const linkStr = links.length ? ` (${links.join(' | ')})` : '';
          return `• **${p.name}@${p.version}**${linkStr}`;
        })
        .join('\n'),
    },
  ];

  // Add changelog embeds
  for (const pkg of message.packages) {
    if (pkg.changelog) {
      embeds.push({
        title: pkg.name,
        description: pkg.changelog,
        color: SUCCESS_COLOR,
      });
    }
  }

  return {
    username: config.username,
    avatar_url: config.avatarUrl,
    embeds,
  };
}
