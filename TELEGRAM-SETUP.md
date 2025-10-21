# 🤖 Telegram Bot Setup & Testing Guide

## ✅ Configuration Status

Please create a new bot for this project
```
TELEGRAM_TOKEN Bot Token=75xxxx
TELEGRAM_CHAT_ID=-xxxxxxxx
ENABLE_TELEGRAM_NOTIFICATIONS=true
```

## 🔧 What Was Fixed

**Problem**: Telegram notifications were configured but never called during audits.

**Solution**: Added notification calls throughout the audit workflow:
- ✅ Audit start notification
- ✅ Clone complete notification
- ✅ Static analysis complete with top 5 findings
- ✅ Dynamic tests complete (if enabled)
- ✅ PR created notification (if enabled)
- ✅ Audit complete summary
- ✅ Error notifications

## 📱 Test Your Telegram Bot

### 1. Verify Bot is Running

After starting the server with `pnpm dev:server`, you should see:
```
✅ Telegram bot initialized
```

### 2. Test Bot Commands

Open your Telegram chat and try:

```
/start
```
You should receive:
```
🤖 SmartAudit Agent

I'm your autonomous smart contract security auditor!

Commands:
/help - Show available commands
/status - Check agent status
```

```
/status
```
You should receive:
```
✅ Agent Status: Online

⚙️ Configuration:
- Model: gemini-2.0-flash-exp
- Chain: Arbitrum Sepolia
- Static Analysis: Enabled
- Dynamic Testing: Enabled
```

### 3. Run an Audit to Test Notifications

1. Start an audit from the web UI (http://localhost:3000)
2. You should receive these notifications in order:

**🚀 Audit Started**
```
📦 Repository: `<your-repo>`
🆔 Audit ID: `audit-xxxxx`
⏰ Started: XX:XX:XX

Cloning repository and preparing analysis...
```

**✅ Clone Complete**
```
📦 Repository: `<your-repo>`
📄 Found X Solidity contracts

Starting static analysis...
```

**🔍 Static Analysis Complete**
```
📊 Summary:
🔴 Critical: 0
🟠 High: 0
🟡 Medium: 3
📝 Total Issues: 3

🎯 Top 3 Issues:

1. 🟡 Unsafe .call{value:...} Pattern
   📁 `contracts/Token.sol:42`
   Found suspicious pattern: ...

Proceeding to dynamic testing...
```

**🎉 Audit Complete!**
```
📦 Repository: `<your-repo>`
🆔 Audit ID: `audit-xxxxx`
⏱️ Duration: X minutes

📊 Results:
🔴 Critical: 0
🟠 High: 0
🟡 Medium: 3
📝 Total Issues: 3
🔧 Automated Fixes: 0

✨ Full report available in memory/audit-xxxxx/
```

## 🐛 Troubleshooting

### Bot Not Responding

1. **Check Token Format**
   - Should start with numbers: `1234567890:ABC...`
   - Get from [@BotFather](https://t.me/BotFather)

2. **Check Chat ID**
   - For groups: Should be negative (e.g., `-1002506282512`)
   - For private chat: Should be positive (e.g., `123456789`)
   - Get using [@userinfobot](https://t.me/userinfobot)

3. **Bot Permissions**
   - Add bot to your group/channel
   - Make sure bot has permission to send messages
   - For groups: Bot must be an admin or posting must be allowed

### Server Not Initializing Bot

Check logs for:
```
⚠️ Telegram notifications disabled - missing token
```

If you see this:
1. Verify `.env` has `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID`
2. Verify `ENABLE_TELEGRAM_NOTIFICATIONS=true`
3. Restart the server

### Not Receiving Audit Notifications

If bot commands work but audit notifications don't:
1. Check server logs for errors
2. Verify audit is actually running
3. Look for "Telegram message sent" in debug logs

## 📝 Message Formats

All messages use **Markdown** formatting:
- `*bold*` for emphasis
- `` `code` `` for code/paths
- `[link text](url)` for links

## 🚀 Advanced: Webhook Setup (Optional)

For production, you can use webhooks instead of polling:

```typescript
// In your production server
import { setupTelegramWebhook } from './telegram/telegramBot';

await setupTelegramWebhook('https://your-domain.com/telegram/webhook');
```

The endpoint `/telegram/webhook` is already implemented in `server.ts`.

## 📊 Example Full Audit Notification Flow

```
🚀 Audit Started
   └─ 📦 Cloning repo...

✅ Clone Complete
   └─ 📄 Found 5 contracts

🔍 Static Analysis Complete
   └─ 📊 Found 3 medium issues
   └─ 🎯 Top 3 shown

🧪 Dynamic Testing Complete
   └─ ✅ 2 contracts deployed
   └─ 🔄 5 transactions executed

✅ Pull Request Created
   └─ 🔗 Link to PR
   └─ 🔧 0 automated fixes

🎉 Audit Complete!
   └─ ⏱️ Duration: 1 minute
   └─ 📊 Full summary
   └─ 🔗 PR link (if created)
```

## 🎯 What's Next?

Your Telegram bot is now fully integrated! Every audit will send notifications automatically.

Test it now:
1. `pnpm dev:server` (if not already running)
2. Open http://localhost:3000
3. Start an audit
4. Watch your Telegram for live updates! 🎉
