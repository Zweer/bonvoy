# @bonvoy/plugin-discord

Discord notification plugin for bonvoy. Sends release notifications to Discord channels via webhooks.

## Installation

```bash
npm install @bonvoy/plugin-discord
```

## Usage

Create a [Discord Webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) in your server settings, then:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-discord', {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    }]
  ]
};
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `webhookUrl` | `string` | Yes | Discord webhook URL |
| `username` | `string` | No | Bot username (overrides webhook default) |
| `avatarUrl` | `string` | No | Bot avatar URL |
| `onSuccess` | `boolean` | No | Send on success (default: `true`) |
| `onFailure` | `boolean` | No | Send on failure (default: `false`) |
| `includeChangelog` | `boolean` | No | Include changelog in message (default: `true`) |

## Message Format

The plugin sends rich Discord embeds with:
- Color-coded status (green for success, red for failure)
- Package list with npm and GitHub release links
- Separate embeds for each package's changelog

## Environment Variables

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## License

MIT
