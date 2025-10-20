/**
 * Live Demo
 * 
 * Runs a real audit on a sample repository
 */

import * as dotenv from 'dotenv';
import { runAudit } from '../agent/smartAuditAgent';
import { createLogger } from '../utils/logger';
import { config, validateConfig } from '../utils/config';
import {
  initTelegramBot,
  notifyAuditStart,
  notifyAuditComplete,
} from '../telegram/telegramBot';

dotenv.config();

const logger = createLogger('LiveDemo');

/**
 * Sample repositories for testing
 */
const SAMPLE_REPOS = [
  {
    name: 'Simple Vault',
    url: 'https://github.com/OpenZeppelin/openzeppelin-contracts',
    branch: 'master',
    description: 'OpenZeppelin Contracts - Well-tested library',
  },
  // Add more sample repos as needed
];

/**
 * Runs a live audit demo
 */
async function runLiveDemo(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║      🔒 SmartAudit Agent - LIVE DEMO              ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
  
  // Validate configuration
  const validation = validateConfig(config, true);
  
  if (!validation.isValid) {
    logger.error('❌ Configuration error! Missing required environment variables:');
    validation.missing.forEach(key => logger.error(`  - ${key}`));
    logger.error('\n📝 Please ensure your .env file is configured with all required values.');
    logger.error('See .env.example for reference.\n');
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    logger.warn('⚠️  Configuration warnings:');
    validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
    console.log('');
  }
  
  logger.info('✅ Configuration validated');
  logger.info(`🤖 Model: ${config.llmModel}`);
  logger.info(`⛓️  Chain: Arbitrum Sepolia (${config.chainId})`);
  logger.info(`🔗 RPC URLs: ${config.rpcUrls.length} configured`);
  console.log('');
  
  // Initialize Telegram
  if (config.enableTelegramNotifications) {
    initTelegramBot();
    logger.info('💬 Telegram notifications enabled');
  }
  
  // Select repository
  logger.info('📦 Sample repository for demo:');
  const repo = SAMPLE_REPOS[0];
  logger.info(`   Name: ${repo.name}`);
  logger.info(`   URL: ${repo.url}`);
  logger.info(`   Branch: ${repo.branch}`);
  logger.info(`   Description: ${repo.description}`);
  console.log('');
  
  // Confirm
  logger.warn('⚠️  This will perform a REAL audit:');
  logger.warn('  - Clone the repository');
  logger.warn('  - Run static analysis tools');
  logger.warn('  - Deploy contracts to Arbitrum Sepolia testnet (uses real gas!)');
  logger.warn('  - Create a Pull Request on GitHub');
  console.log('');
  logger.info('⏳ Starting audit in 5 seconds... (Ctrl+C to cancel)');
  console.log('');
  
  await sleep(5000);
  
  try {
    logger.info('🚀 Starting live audit...');
    console.log('');
    
    const startTime = Date.now();
    
    // Send Telegram notification
    if (config.enableTelegramNotifications) {
      const auditId = `audit-${Date.now()}`;
      await notifyAuditStart(repo.url, auditId);
    }
    
    // Run audit
    const result = await runAudit({
      repoUrl: repo.url,
      branch: repo.branch,
      runDynamicTests: config.enableDynamicTesting,
      createPullRequest: config.enableAutoPR,
    });
    
    const duration = Date.now() - startTime;
    const durationMinutes = Math.round(duration / 1000 / 60);
    
    console.log('');
    console.log('='.repeat(70));
    
    if (result.success) {
      console.log('🎉 AUDIT COMPLETE!');
      console.log('='.repeat(70));
      console.log('');
      console.log('📊 Results:');
      console.log(`   Audit ID: ${result.auditId}`);
      console.log(`   Duration: ${durationMinutes} minutes`);
      console.log('');
      console.log('📋 Findings:');
      console.log(`   🔴 Critical: ${result.summary.critical}`);
      console.log(`   🟠 High: ${result.summary.high}`);
      console.log(`   🟡 Medium: ${result.summary.medium}`);
      console.log(`   🔵 Low: ${result.summary.low}`);
      console.log(`   ℹ️  Info: ${result.summary.info}`);
      console.log(`   📝 Total: ${result.summary.total}`);
      console.log('');
      console.log(`🔧 Automated Fixes: ${result.fixes.length}`);
      
      if (result.dynamicTestResult) {
        console.log('');
        console.log('🧪 Dynamic Testing:');
        console.log(`   Contracts Deployed: ${result.dynamicTestResult.summary.totalDeployed}`);
        console.log(`   Transactions: ${result.dynamicTestResult.summary.totalTransactions}`);
        console.log(`   Success Rate: ${result.dynamicTestResult.summary.successfulTx}/${result.dynamicTestResult.summary.totalTransactions}`);
        console.log(`   Gas Used: ${result.dynamicTestResult.summary.totalGasUsed}`);
        
        if (result.dynamicTestResult.deployments.length > 0) {
          console.log('');
          console.log('📦 Deployed Contracts:');
          result.dynamicTestResult.deployments.forEach((deploy: any) => {
            console.log(`   - ${deploy.contractName}: ${deploy.address}`);
            console.log(`     🔗 https://sepolia.arbiscan.io/address/${deploy.address}`);
          });
        }
      }
      
      if (result.prUrl) {
        console.log('');
        console.log(`🔗 Pull Request: ${result.prUrl}`);
      }
      
      console.log('');
      console.log(`📁 Full report: memory/${result.auditId}/audit-report.json`);
      console.log('');
      
      // Send Telegram notification
      if (config.enableTelegramNotifications) {
        await notifyAuditComplete(result);
      }
      
    } else {
      console.log('❌ AUDIT FAILED');
      console.log('='.repeat(70));
      console.log('');
      console.log(`Error: ${result.error}`);
      console.log('');
    }
    
    console.log('='.repeat(70));
    console.log('');
    console.log('✨ Demo complete!');
    console.log('');
    
  } catch (error) {
    logger.error(`\n❌ Demo failed: ${error}\n`);
    process.exit(1);
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
runLiveDemo().catch(console.error);
