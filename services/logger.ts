/**
 * Logger Service
 *
 * Centralized logging with environment-aware behavior.
 * Replaces direct console.* calls throughout the codebase.
 *
 * Features:
 * - Environment-aware (only logs in development by default)
 * - Structured logging with timestamps
 * - Log level filtering
 * - Optional error tracking integration
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
  source?: string;
}

// Configuration
let currentLogLevel = LogLevel.DEBUG;
let isDevelopment = true;

// Try to detect environment
try {
  isDevelopment = import.meta.env?.DEV ?? true;
} catch {
  // Fallback for non-Vite environments
  isDevelopment = process.env.NODE_ENV !== 'production';
}

// Log history for debugging
const logHistory: LogEntry[] = [];
const MAX_HISTORY = 100;

/**
 * Set the minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Format a log message
 */
function formatMessage(level: string, message: string, source?: string): string {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const sourcePrefix = source ? `[${source}] ` : '';
  return `[${timestamp}] [${level}] ${sourcePrefix}${message}`;
}

/**
 * Add to log history
 */
function addToHistory(entry: LogEntry): void {
  logHistory.push(entry);
  if (logHistory.length > MAX_HISTORY) {
    logHistory.shift();
  }
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  levelName: string,
  message: string,
  data?: unknown,
  source?: string
): void {
  // Skip if below current log level
  if (level < currentLogLevel) return;

  // Skip in production unless error
  if (!isDevelopment && level < LogLevel.ERROR) return;

  const entry: LogEntry = {
    level,
    message,
    data,
    timestamp: Date.now(),
    source,
  };

  addToHistory(entry);

  const formattedMessage = formatMessage(levelName, message, source);

  switch (level) {
    case LogLevel.DEBUG:
      if (data !== undefined) {
        console.debug(formattedMessage, data);
      } else {
        console.debug(formattedMessage);
      }
      break;
    case LogLevel.INFO:
      if (data !== undefined) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
      break;
    case LogLevel.WARN:
      if (data !== undefined) {
        console.warn(formattedMessage, data);
      } else {
        console.warn(formattedMessage);
      }
      break;
    case LogLevel.ERROR:
      if (data !== undefined) {
        console.error(formattedMessage, data);
      } else {
        console.error(formattedMessage);
      }
      break;
  }
}

/**
 * Logger interface
 */
export const logger = {
  /**
   * Debug level - for development diagnostics
   */
  debug(message: string, data?: unknown, source?: string): void {
    log(LogLevel.DEBUG, 'DEBUG', message, data, source);
  },

  /**
   * Info level - for general information
   */
  info(message: string, data?: unknown, source?: string): void {
    log(LogLevel.INFO, 'INFO', message, data, source);
  },

  /**
   * Warn level - for potential issues
   */
  warn(message: string, data?: unknown, source?: string): void {
    log(LogLevel.WARN, 'WARN', message, data, source);
  },

  /**
   * Error level - for errors (always logged)
   */
  error(message: string, error?: unknown, source?: string): void {
    log(LogLevel.ERROR, 'ERROR', message, error, source);
  },

  /**
   * Get log history
   */
  getHistory(): readonly LogEntry[] {
    return logHistory;
  },

  /**
   * Clear log history
   */
  clearHistory(): void {
    logHistory.length = 0;
  },

  /**
   * Create a scoped logger for a specific source
   */
  scope(source: string) {
    return {
      debug: (message: string, data?: unknown) => logger.debug(message, data, source),
      info: (message: string, data?: unknown) => logger.info(message, data, source),
      warn: (message: string, data?: unknown) => logger.warn(message, data, source),
      error: (message: string, error?: unknown) => logger.error(message, error, source),
    };
  },
};

/**
 * Create a scoped logger for a service/component
 */
export function createLogger(source: string) {
  return logger.scope(source);
}

// Default export
export default logger;
