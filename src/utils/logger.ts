/**
 * Logger utility for consistent logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  return `[${timestamp}] ${levelStr} [${context}] ${message}`;
}

export function createLogger(context: string): Logger {
  return {
    debug: (message: string, ...args: any[]) => {
      if (shouldLog('debug')) {
        console.log(formatMessage('debug', context, message), ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (shouldLog('info')) {
        console.log(formatMessage('info', context, message), ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', context, message), ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', context, message), ...args);
      }
    },
  };
}

// Global logger
export const logger = createLogger('App');
