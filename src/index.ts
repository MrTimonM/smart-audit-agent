/**
 * SmartAudit Agent - Main Entry Point
 */

import * as dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { config, validateConfig } from './utils/config';

// Load environment variables
dotenv.config();

const logger = createLogger('Main');

async function main() {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║          🔒 SmartAudit Agent                       ║
║   Autonomous Smart Contract Security Auditor      ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
  
  // Validate configuration
  const validation = validateConfig(config);
  
  if (!validation.isValid) {
    logger.error('Configuration error! Missing required environment variables:');
    validation.missing.forEach(key => logger.error(`  - ${key}`));
    logger.error('\nPlease check your .env file and ensure all required variables are set.');
    logger.error('See .env.example for reference.');
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    logger.warn('Configuration warnings:');
    validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
    console.log('');
  }
  
  logger.info('Configuration validated successfully');
  logger.info(`Model: ${config.llmModel}`);
  logger.info(`Chain: Arbitrum Sepolia (${config.chainId})`);
  
  // Start the server
  logger.info('Starting web server...');
  const { startServer } = await import('./server');
  await startServer();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error}`);
  process.exit(1);
});

// Start
main().catch((error) => {
  logger.error(`Failed to start: ${error}`);
  process.exit(1);
});
