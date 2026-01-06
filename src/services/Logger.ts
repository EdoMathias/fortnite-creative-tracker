type LogMethod = 'log' | 'warn' | 'error' | 'debug';

export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

class ScopedLogger implements Logger {
  constructor(private readonly scope: string) {}

  log = (...args: unknown[]) => {
    this.write('log', ...args);
  };

  warn = (...args: unknown[]) => {
    this.write('warn', ...args);
  };

  error = (...args: unknown[]) => {
    this.write('error', ...args);
  };

  debug = (...args: unknown[]) => {
    this.write('debug', ...args);
  };

  private write(method: LogMethod, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.scope}]`;
    const consoleMethod = console[method] ?? console.log;
    consoleMethod.call(console, prefix, ...args);
  }
}

export const createLogger = (scope: string): Logger => new ScopedLogger(scope);

declare global {
  interface Window {
    recycleLoggerFactory?: (scope: string) => Logger;
  }
}

if (typeof window !== 'undefined') {
  window.recycleLoggerFactory = createLogger;
}

