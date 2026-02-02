# @bonvoy/plugin-teams

Microsoft Teams notification plugin for bonvoy. Sends release notifications via Teams webhooks.

## Installation

```bash
npm install @bonvoy/plugin-teams
```

## Usage

1. Create an [Incoming Webhook](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook) in Teams
2. Configure the plugin:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-teams', {
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    }]
  ]
};
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `webhookUrl` | `string` | Yes | Teams webhook URL |
| `onSuccess` | `boolean` | No | Send on success (default: `true`) |
| `onFailure` | `boolean` | No | Send on failure (default: `false`) |
| `includeChangelog` | `boolean` | No | Include changelog (default: `true`) |

## Message Format

Uses [MessageCard](https://learn.microsoft.com/en-us/outlook/actionable-messages/message-card-reference) format with:
- Color-coded theme (green/red)
- Package facts with links
- Changelog sections

## Environment Variables

```bash
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```

## License

MIT
