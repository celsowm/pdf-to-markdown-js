/**
 * Supported log levels.
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5,
}

/**
 * Interface for the logging system to follow SOLID principles.
 */
export interface ILogger {
  setLevel(level: LogLevel): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  verbose(message: string, ...args: any[]): void;
  isEnabled(level: LogLevel): boolean;
}

/**
 * Default logger implementation that outputs to the console.
 */
class LoggerImpl implements ILogger {
  private level: LogLevel = LogLevel.WARN;

  constructor() {
    // Allow setting level from global scope (browser console)
    if (typeof window !== 'undefined') {
      (window as any).setPdfLogLevel = (level: number) => this.setLevel(level);
      (window as any).PdfLogLevel = LogLevel;
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string): string {
    return `[${this.getTimestamp()}] [PdfToMarkdown] ${level}: ${message}`;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
    console.info(this.formatMessage('INFO', `Log level set to ${LogLevel[level]}`));
  }

  isEnabled(level: LogLevel): boolean {
    return this.level >= level;
  }

  error(message: string, ...args: any[]): void {
    if (this.isEnabled(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.isEnabled(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.isEnabled(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.isEnabled(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (this.isEnabled(LogLevel.VERBOSE)) {
      console.log(this.formatMessage('VERBOSE', message), ...args);
    }
  }
}

// Export a singleton instance
export const logger: ILogger = new LoggerImpl();
