/**
 * Telegram Bot Integration
 * 
 * Sends notifications via Telegram for audit progress and results
 */

import TelegramBot from 'node-telegram-bot-api';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';
import type { AuditResult } from '../agent/smartAuditAgent';
import type { Finding } from '../actions/runStaticAnalysis';

const logger = createLogger('TelegramBot');

let bot: TelegramBot | null = null;

/**
 * Initializes the Telegram bot
 */
export function initTelegramBot(): TelegramBot | null {
  if (!config.enableTelegramNotifications || !config.telegramToken) {
    logger.warn('Telegram notifications disabled - missing token');
    return null;
  }
  
  try {
    bot = new TelegramBot(config.telegramToken, { polling: false });
    logger.info('Telegram bot initialized');
    return bot;
  } catch (error) {
    logger.error(`Failed to initialize Telegram bot: ${error}`);
    return null;
  }
}

/**
 * Sends a message to the configured chat
 */
export async function sendTelegramMessage(message: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<void> {
  if (!bot || !config.telegramChatId) {
    logger.debug('Telegram not configured, skipping message');
    return;
  }
  
  try {
    await bot.sendMessage(config.telegramChatId, message, {
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });
    logger.debug('Telegram message sent');
  } catch (error) {
    logger.error(`Failed to send Telegram message: ${error}`);
  }
}

/**
 * Sends audit start notification
 */
export async function notifyAuditStart(repoUrl: string, auditId: string): Promise<void> {
  const message = `🚀 *Audit Started*

📦 Repository: \`${repoUrl}\`
🆔 Audit ID: \`${auditId}\`
⏰ Started: ${new Date().toLocaleTimeString()}

Cloning repository and preparing analysis...`;

  await sendTelegramMessage(message);
}

/**
 * Sends clone complete notification
 */
export async function notifyCloneComplete(repoUrl: string, contractCount: number): Promise<void> {
  const message = `✅ *Clone Complete*

📦 Repository: \`${repoUrl}\`
📄 Found ${contractCount} Solidity contracts

Starting static analysis...`;

  await sendTelegramMessage(message);
}

/**
 * Sends static analysis complete notification
 */
export async function notifyStaticAnalysisComplete(
  findings: Finding[],
  topFindings: Finding[]
): Promise<void> {
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;
  const medium = findings.filter(f => f.severity === 'medium').length;
  
  let message = `🔍 *Static Analysis Complete*

📊 **Summary:**
🔴 Critical: ${critical}
🟠 High: ${high}
🟡 Medium: ${medium}
📝 Total Issues: ${findings.length}

`;

  if (topFindings.length > 0) {
    message += `🎯 **Top ${topFindings.length} Issues:**\n\n`;
    
    topFindings.forEach((finding, index) => {
      const emoji = finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : '🟡';
      message += `${index + 1}. ${emoji} *${finding.title}*\n`;
      message += `   📁 \`${finding.file}:${finding.line}\`\n`;
      message += `   ${finding.description.substring(0, 100)}...\n\n`;
    });
  }
  
  message += `Proceeding to dynamic testing...`;

  await sendTelegramMessage(message);
}

/**
 * Sends dynamic testing complete notification
 */
export async function notifyDynamicTestsComplete(
  deployed: number,
  transactions: number,
  successRate: number
): Promise<void> {
  const message = `🧪 *Dynamic Testing Complete*

⛓️ **Arbitrum Sepolia Results:**
✅ Contracts Deployed: ${deployed}
🔄 Transactions Executed: ${transactions}
📈 Success Rate: ${successRate.toFixed(1)}%

Generating automated fixes...`;

  await sendTelegramMessage(message);
}

/**
 * Sends PR created notification
 */
export async function notifyPRCreated(prUrl: string, fixesCount: number, topFindings: string[]): Promise<void> {
  let message = `✅ *Pull Request Created*

🔗 [View PR](${prUrl})

📝 **Summary:**
🔧 Automated Fixes: ${fixesCount}
`;

  if (topFindings.length > 0) {
    message += `\n🎯 **Top Issues:**\n`;
    topFindings.forEach((finding, index) => {
      message += `${index + 1}. ${finding}\n`;
    });
  }
  
  message += `\n✨ Review and merge when ready!`;

  await sendTelegramMessage(message);
}

/**
 * Sends audit complete notification
 */
export async function notifyAuditComplete(result: AuditResult): Promise<void> {
  const durationMinutes = Math.round(result.duration / 1000 / 60);
  
  let message = `🎉 *Audit Complete!*

📦 Repository: \`${result.repoUrl}\`
🆔 Audit ID: \`${result.auditId}\`
⏱️ Duration: ${durationMinutes} minutes

📊 **Results:**
🔴 Critical: ${result.summary.critical}
🟠 High: ${result.summary.high}
🟡 Medium: ${result.summary.medium}
📝 Total Issues: ${result.summary.total}
🔧 Automated Fixes: ${result.fixes.length}
`;

  if (result.prUrl) {
    message += `\n🔗 [View Pull Request](${result.prUrl})`;
  }
  
  if (result.dynamicTestResult) {
    message += `\n\n🧪 **Dynamic Testing:**`;
    message += `\n✅ Contracts Deployed: ${result.dynamicTestResult.summary.totalDeployed}`;
    message += `\n🔄 Transactions: ${result.dynamicTestResult.summary.totalTransactions}`;
  }
  
  message += `\n\n✨ Full report available in memory/${result.auditId}/`;

  await sendTelegramMessage(message);
}

/**
 * Sends audit error notification
 */
export async function notifyAuditError(repoUrl: string, error: string): Promise<void> {
  const message = `❌ *Audit Failed*

📦 Repository: \`${repoUrl}\`
⚠️ Error: ${error}

Please check the logs for details.`;

  await sendTelegramMessage(message);
}

/**
 * Telegram webhook handler for incoming messages
 */
export async function handleTelegramWebhook(update: any): Promise<void> {
  if (!bot) {
    logger.warn('Telegram bot not initialized');
    return;
  }
  
  try {
    const message = update.message;
    
    if (!message || !message.text) {
      return;
    }
    
    const chatId = message.chat.id;
    const text = message.text;
    
    logger.info(`Received message from ${chatId}: ${text}`);
    
    // Handle commands
    if (text === '/start') {
      await bot.sendMessage(
        chatId,
        `🤖 *SmartAudit Agent*\n\nI'm your autonomous smart contract security auditor!\n\nCommands:\n/help - Show available commands\n/status - Check agent status`,
        { parse_mode: 'Markdown' }
      );
    } else if (text === '/help') {
      await bot.sendMessage(
        chatId,
        `📚 *Available Commands:*\n\n/start - Start the bot\n/help - Show this help\n/status - Check agent status\n\nTo run an audit, use the web UI at ${config.baseUrl}`,
        { parse_mode: 'Markdown' }
      );
    } else if (text === '/status') {
      await bot.sendMessage(
        chatId,
        `✅ *Agent Status:* Online\n\n⚙️ Configuration:\n- Model: ${config.llmModel}\n- Chain: Arbitrum Sepolia\n- Static Analysis: ${config.enableStaticAnalysis ? 'Enabled' : 'Disabled'}\n- Dynamic Testing: ${config.enableDynamicTesting ? 'Enabled' : 'Disabled'}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    logger.error(`Error handling Telegram webhook: ${error}`);
  }
}

/**
 * Sets up Telegram webhook
 */
export async function setupTelegramWebhook(webhookUrl: string): Promise<void> {
  if (!bot) {
    logger.warn('Telegram bot not initialized');
    return;
  }
  
  try {
    await bot.setWebHook(webhookUrl);
    logger.info(`Telegram webhook set to ${webhookUrl}`);
  } catch (error) {
    logger.error(`Failed to set Telegram webhook: ${error}`);
  }
}

/**
 * Removes Telegram webhook and starts polling
 */
export async function startTelegramPolling(): Promise<void> {
  if (!bot) {
    logger.warn('Telegram bot not initialized');
    return;
  }
  
  try {
    await bot.deleteWebHook();
    bot.startPolling();
    logger.info('Telegram bot started polling');
  } catch (error) {
    logger.error(`Failed to start Telegram polling: ${error}`);
  }
}
