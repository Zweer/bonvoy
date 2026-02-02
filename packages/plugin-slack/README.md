# @bonvoy/plugin-slack

Slack notification plugin for bonvoy. Sends release notifications to Slack channels.

## Installation

```bash
npm install @bonvoy/plugin-slack
```

## Usage

Two authentication methods are supported:

### Option 1: Webhook URL (simpler)

Create an [Incoming Webhook](https://api.slack.com/messaging/webhooks) in Slack, then:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-slack', {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#releases',  // optional, overrides webhook default
    }]
  ]
};
```

### Option 2: Bot Token (more flexible)

Create a [Slack App](https://api.slack.com/apps) with `chat:write` scope, then:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-slack', {
      token: process.env.SLACK_BOT_TOKEN,  // xoxb-...
      channel: '#releases',                 // required with token
    }]
  ]
};
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `webhookUrl` | `string` | One of `webhookUrl` or `token` | Slack webhook URL |
| `token` | `string` | One of `webhookUrl` or `token` | Slack Bot Token (xoxb-...) |
| `channel` | `string` | Required with `token` | Channel to post to |
| `username` | `string` | No | Bot username |
| `iconEmoji` | `string` | No | Bot icon emoji (e.g., `:rocket:`) |
| `mentions` | `string[]` | No | Users/groups to mention (e.g., `['@here', '<@U123>']`) |
| `onSuccess` | `boolean` | No | Send on success (default: `true`) |
| `onFailure` | `boolean` | No | Send on failure (default: `false`) |
| `includeChangelog` | `boolean` | No | Include changelog in message (default: `true`) |

## Message Format

The plugin sends rich Slack messages using [Block Kit](https://api.slack.com/block-kit):

```
🚀 Released 2 packages

• @myorg/core@1.2.0 (npm | release)
• @myorg/utils@1.1.0 (npm | release)

────────────────────
@myorg/core
- feat: add new feature
- fix: resolve bug
```

## Environment Variables

```bash
# Webhook method
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Bot method
SLACK_BOT_TOKEN=xoxb-...
```

## License

MIT
