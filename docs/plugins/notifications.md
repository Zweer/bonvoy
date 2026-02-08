# Notification Plugins

Send release notifications to your team via Slack, Discord, Telegram, or Microsoft Teams.

## Slack

```bash
npm install -D @bonvoy/plugin-slack
```

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-slack', {
      // Option 1: Incoming Webhook
      webhookUrl: process.env.SLACK_WEBHOOK_URL,

      // Option 2: Bot API
      token: process.env.SLACK_BOT_TOKEN,
      channel: '#releases',
    }]
  ],
};
```

## Discord

```bash
npm install -D @bonvoy/plugin-discord
```

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-discord', {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    }]
  ],
};
```

## Telegram

```bash
npm install -D @bonvoy/plugin-telegram
```

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-telegram', {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    }]
  ],
};
```

## Microsoft Teams

```bash
npm install -D @bonvoy/plugin-teams
```

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-teams', {
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    }]
  ],
};
```

## Common Options

All notification plugins support:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onSuccess` | `boolean` | `true` | Send notification on successful release |
| `onFailure` | `boolean` | `false` | Send notification on failed release |
| `includeChangelog` | `boolean` | `true` | Include changelog in the message |

## Writing a Custom Notification Plugin

All notification plugins extend `@bonvoy/plugin-notification`:

```typescript
import { NotificationPlugin } from '@bonvoy/plugin-notification';

export default class MyNotificationPlugin extends NotificationPlugin {
  name = 'my-notification';

  async send(message: string): Promise<void> {
    await fetch('https://my-service.com/notify', {
      method: 'POST',
      body: JSON.stringify({ text: message }),
    });
  }
}
```
