import type { NotificationConfig, NotificationMessage } from '@bonvoy/plugin-notification';

export interface TelegramConfig extends NotificationConfig {
  /** Telegram Bot Token (required) */
  botToken: string;
  /** Chat ID to send messages to (required) */
  chatId: string;
  /** Parse mode for message formatting (default: 'HTML') */
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  /** Disable link previews (default: true) */
  disableWebPagePreview?: boolean;
}

export function buildTelegramMessage(message: NotificationMessage): string {
  const lines: string[] = [`<b>${escapeHtml(message.title)}</b>`, ''];

  for (const pkg of message.packages) {
    const links = [];
    if (pkg.npmUrl) links.push(`<a href="${pkg.npmUrl}">npm</a>`);
    if (pkg.githubUrl) links.push(`<a href="${pkg.githubUrl}">release</a>`);
    const linkStr = links.length ? ` (${links.join(' | ')})` : '';
    lines.push(`• <b>${escapeHtml(pkg.name)}@${pkg.version}</b>${linkStr}`);
  }

  for (const pkg of message.packages) {
    if (pkg.changelog) {
      lines.push('', `<b>${escapeHtml(pkg.name)}</b>`, `<pre>${escapeHtml(pkg.changelog)}</pre>`);
    }
  }

  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
