import path from 'path';
import fs from 'fs';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private logLevel: LogLevel;
  private logFile?: string;

  constructor() {
    const level = process.env.LOG_LEVEL || 'info';
    this.logLevel = this.parseLogLevel(level);
    this.logFile = process.env.LOG_FILE;
    
    // Ensure log directory exists
    if (this.logFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  private writeLog(level: string, message: string, meta?: any): void {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output
    if (level === 'error') {
      console.error(formattedMessage);
    } else if (level === 'warn') {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
    
    // File output
    if (this.logFile) {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    }
  }

  public error(message: string, meta?: any): void {
    if (this.logLevel >= LogLevel.ERROR) {
      this.writeLog('error', message, meta);
    }
  }

  public warn(message: string, meta?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      this.writeLog('warn', message, meta);
    }
  }

  public info(message: string, meta?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      this.writeLog('info', message, meta);
    }
  }

  public debug(message: string, meta?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.writeLog('debug', message, meta);
    }
  }
}

export const logger = new Logger();
export default logger;