# @bonvoy/plugin-telegram

Telegram notification plugin for bonvoy. Sends release notifications via Telegram Bot API.

## Installation

```bash
npm install @bonvoy/plugin-telegram
```

## Usage

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID (use [@userinfobot](https://t.me/userinfobot))
3. Configure the plugin:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-telegram', {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    }]
  ]
};
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `botToken` | `string` | Yes | Telegram Bot Token from BotFather |
| `chatId` | `string` | Yes | Chat/Group/Channel ID |
| `parseMode` | `string` | No | Message format: `HTML`, `Markdown`, `MarkdownV2` (default: `HTML`) |
| `disableWebPagePreview` | `boolean` | No | Disable link previews (default: `true`) |
| `onSuccess` | `boolean` | No | Send on success (default: `true`) |
| `onFailure` | `boolean` | No | Send on failure (default: `false`) |

## Environment Variables

```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=-1001234567890
```

## License

MIT
