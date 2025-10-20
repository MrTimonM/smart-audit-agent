/**
 * Environment configuration and validation
 */

import * as dotenv from 'dotenv';
import { createLogger } from './logger';

const logger = createLogger('Config');

// Load environment variables
dotenv.config();

export interface Config {
  // AI Model
  geminiApiKey: string;
  llmModel: string;

  // GitHub
  githubToken: string;

  // Blockchain
  testnetPrivateKey: string;
  rpcUrls: string[];
  chainId: number;

  // Telegram
  telegramToken: string;
  telegramChatId: string;

  // Server
  port: number;
  baseUrl: string;

  // Features
  enableStaticAnalysis: boolean;
  enableDynamicTesting: boolean;
  enableAutoPR: boolean;
  enableTelegramNotifications: boolean;

  // Agent
  maxAnalysisTime: number;
  
  // Logging
  logLevel: string;
  debugMode: boolean;
}

/**
 * Validates and returns configuration
 */
export function getConfig(): Config {
  const config: Config = {
    // AI Model
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GENIE_API_KEY || '',
    llmModel: process.env.LLM_MODEL || 'gemini-2.5-flash',

    // GitHub
    githubToken: process.env.GITHUB_TOKEN || '',

    // Blockchain
    testnetPrivateKey: process.env.TESTNET_PRIVATE_KEY || '',
    rpcUrls: (process.env.RPC_URLS || '').split(',').filter(Boolean),
    chainId: parseInt(process.env.CHAIN_ID || '421614', 10),

    // Telegram
    telegramToken: process.env.TELEGRAM_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',

    // Features
    enableStaticAnalysis: process.env.ENABLE_STATIC_ANALYSIS !== 'false',
    enableDynamicTesting: process.env.ENABLE_DYNAMIC_TESTING !== 'false',
    enableAutoPR: process.env.ENABLE_AUTO_PR !== 'false',
    enableTelegramNotifications: process.env.ENABLE_TELEGRAM_NOTIFICATIONS !== 'false',

    // Agent
    maxAnalysisTime: parseInt(process.env.MAX_ANALYSIS_TIME || '30', 10),
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    debugMode: process.env.DEBUG_MODE === 'true',
  };

  return config;
}

/**
 * Validates required configuration
 */
export function validateConfig(config: Config, requireAll = false): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!config.geminiApiKey) {
    missing.push('GEMINI_API_KEY');
  }

  if (requireAll) {
    if (!config.githubToken) {
      missing.push('GITHUB_TOKEN');
    }
    if (!config.testnetPrivateKey) {
      missing.push('TESTNET_PRIVATE_KEY');
    }
    if (config.rpcUrls.length === 0) {
      missing.push('RPC_URLS');
    }
  } else {
    if (!config.githubToken) {
      warnings.push('GITHUB_TOKEN not set - PR creation will be disabled');
    }
    if (!config.testnetPrivateKey) {
      warnings.push('TESTNET_PRIVATE_KEY not set - dynamic testing will be disabled');
    }
    if (config.rpcUrls.length === 0) {
      warnings.push('RPC_URLS not set - dynamic testing will be disabled');
    }
  }

  if (config.enableTelegramNotifications) {
    if (!config.telegramToken) {
      warnings.push('TELEGRAM_TOKEN not set - notifications will be disabled');
    }
    if (!config.telegramChatId) {
      warnings.push('TELEGRAM_CHAT_ID not set - notifications will be disabled');
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Logs configuration status
 */
export function logConfigStatus(config: Config): void {
  const validation = validateConfig(config, false);

  logger.info('Configuration loaded');
  logger.info(`Model: ${config.llmModel}`);
  logger.info(`Chain: Arbitrum Sepolia (${config.chainId})`);
  logger.info(`RPC URLs: ${config.rpcUrls.length} configured`);

  if (validation.warnings.length > 0) {
    logger.warn('Configuration warnings:');
    validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  if (!validation.isValid) {
    logger.error('Missing required configuration:');
    validation.missing.forEach(key => logger.error(`  - ${key}`));
    throw new Error('Missing required environment variables. Check .env file.');
  }
}

export const config = getConfig();
