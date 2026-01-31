import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, createLogger, setLogLevel, getLogLevel, LogLevel } from '../logger';

describe('Logger Service', () => {
  beforeEach(() => {
    // Reset log level before each test
    setLogLevel(LogLevel.DEBUG);
    logger.clearHistory();
    vi.clearAllMocks();
  });

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      logger.debug('test debug message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log info messages', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
      logger.info('test info message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log warn messages', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('test warn message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log error messages', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('test error message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect log level settings', () => {
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      // Set level to INFO, debug should be skipped
      setLogLevel(LogLevel.INFO);
      logger.debug('should not appear');
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should get current log level', () => {
      setLogLevel(LogLevel.WARN);
      expect(getLogLevel()).toBe(LogLevel.WARN);
    });
  });

  describe('Log History', () => {
    it('should track log history', () => {
      vi.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('message 1');
      logger.info('message 2');

      const history = logger.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].message).toBe('message 1');
      expect(history[1].message).toBe('message 2');
    });

    it('should clear log history', () => {
      vi.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('message');
      expect(logger.getHistory().length).toBe(1);

      logger.clearHistory();
      expect(logger.getHistory().length).toBe(0);
    });
  });

  describe('Scoped Logger', () => {
    it('should create scoped loggers', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const scopedLog = createLogger('TestService');
      scopedLog.info('scoped message');

      expect(spy).toHaveBeenCalled();
      const call = spy.mock.calls[0][0] as string;
      expect(call).toContain('[TestService]');

      spy.mockRestore();
    });

    it('should scope all log levels', () => {
      const scopedLog = logger.scope('MyScope');

      expect(typeof scopedLog.debug).toBe('function');
      expect(typeof scopedLog.info).toBe('function');
      expect(typeof scopedLog.warn).toBe('function');
      expect(typeof scopedLog.error).toBe('function');
    });
  });

  describe('Data Logging', () => {
    it('should log additional data', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const data = { key: 'value' };
      logger.info('with data', data);

      expect(spy).toHaveBeenCalledWith(expect.any(String), data);
      spy.mockRestore();
    });
  });
});
