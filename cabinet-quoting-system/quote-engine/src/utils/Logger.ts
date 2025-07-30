import fs from 'fs';
import path from 'path';
import { config } from '@/config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  correlation_id?: string;
}

export class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel;
  private logFilePath: string;
  private correlationId?: string;

  private constructor() {
    const loggingConfig = config.getLoggingConfig();
    this.currentLevel = this.parseLogLevel(loggingConfig.level);
    this.logFilePath = loggingConfig.file_path;
    this.ensureLogDirectory();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set correlation ID for request tracing
   */
  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Clear correlation ID
   */
  public clearCorrelationId(): void {
    this.correlationId = undefined;
  }

  /**
   * Log error message
   */
  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log info message
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (level > this.currentLevel) {
      return; // Skip logging if level is below current threshold
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      data: this.sanitizeData(data),
      correlation_id: this.correlationId
    };

    // Console output
    this.logToConsole(logEntry);

    // File output
    this.logToFile(logEntry);
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, data, correlation_id } = entry;
    
    let logMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (correlation_id) {
      logMessage += ` [${correlation_id}]`;
    }

    // Color coding for different levels (if terminal supports it)
    const colorCodes = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m'  // White
    };
    const resetCode = '\x1b[0m';

    if (process.stdout.isTTY) {
      logMessage = `${colorCodes[level as keyof typeof colorCodes]}${logMessage}${resetCode}`;
    }

    console.log(logMessage);

    // Log additional data if present
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log to file
   */
  private logToFile(entry: LogEntry): void {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      
      // Append to log file
      fs.appendFileSync(this.logFilePath, logLine, 'utf8');
      
      // Check file size and rotate if necessary
      this.rotateLogIfNeeded();
      
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeData(data: any): any {
    if (!data) {
      return data;
    }

    // Create a deep copy to avoid modifying original data
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'jwt',
      'api_key',
      'secret',
      'credit_card',
      'ssn',
      'social_security',
      'bank_account'
    ];

    this.removeSensitiveFields(sanitized, sensitiveFields);

    return sanitized;
  }

  /**
   * Recursively remove sensitive fields from object
   */
  private removeSensitiveFields(obj: any, sensitiveFields: string[]): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Check if field name contains sensitive keywords
      const isSensitive = sensitiveFields.some(field => 
        lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        this.removeSensitiveFields(obj[key], sensitiveFields);
      }
    });
  }

  /**
   * Parse log level from string
   */
  private parseLogLevel(levelString: string): LogLevel {
    const upperLevel = levelString.toUpperCase();
    
    switch (upperLevel) {
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARN':
      case 'WARNING':
        return LogLevel.WARN;
      case 'INFO':
        return LogLevel.INFO;
      case 'DEBUG':
        return LogLevel.DEBUG;
      default:
        console.warn(`Unknown log level: ${levelString}, defaulting to INFO`);
        return LogLevel.INFO;
    }
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    try {
      const logDir = path.dirname(this.logFilePath);
      
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   */
  private rotateLogIfNeeded(): void {
    try {
      const loggingConfig = config.getLoggingConfig();
      const maxSizeBytes = this.parseFileSize(loggingConfig.max_size);
      
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        
        if (stats.size > maxSizeBytes) {
          this.rotateLogFile();
        }
      }
    } catch (error) {
      console.error('Failed to check log file size:', error);
    }
  }

  /**
   * Rotate log file
   */
  private rotateLogFile(): void {
    try {
      const loggingConfig = config.getLoggingConfig();
      const maxFiles = loggingConfig.max_files;
      const logDir = path.dirname(this.logFilePath);
      const logName = path.basename(this.logFilePath, path.extname(this.logFilePath));
      const logExt = path.extname(this.logFilePath);

      // Shift existing log files
      for (let i = maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(logDir, `${logName}.${i}${logExt}`);
        const newFile = path.join(logDir, `${logName}.${i + 1}${logExt}`);
        
        if (fs.existsSync(oldFile)) {
          if (i === maxFiles - 1) {
            // Delete the oldest file
            fs.unlinkSync(oldFile);
          } else {
            // Rename to next number
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current log to .1
      const firstRotatedFile = path.join(logDir, `${logName}.1${logExt}`);
      fs.renameSync(this.logFilePath, firstRotatedFile);

    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Parse file size string (e.g., "10m", "1g")
   */
  private parseFileSize(sizeString: string): number {
    const units: Record<string, number> = {
      'b': 1,
      'k': 1024,
      'm': 1024 * 1024,
      'g': 1024 * 1024 * 1024
    };

    const match = sizeString.toLowerCase().match(/^(\d+)([bkmg]?)$/);
    
    if (!match) {
      console.warn(`Invalid file size format: ${sizeString}, defaulting to 10MB`);
      return 10 * 1024 * 1024; // 10MB default
    }

    const size = parseInt(match[1]);
    const unit = match[2] || 'b';

    return size * units[unit];
  }

  /**
   * Create child logger with correlation ID
   */
  public child(correlationId: string): Logger {
    const childLogger = Object.create(this);
    childLogger.correlationId = correlationId;
    return childLogger;
  }

  /**
   * Set log level
   */
  public setLogLevel(level: string): void {
    this.currentLevel = this.parseLogLevel(level);
    this.info('Log level changed', { newLevel: level });
  }

  /**
   * Get current log level
   */
  public getLogLevel(): string {
    return LogLevel[this.currentLevel];
  }

  /**
   * Flush logs (ensure all pending logs are written)
   */
  public flush(): void {
    // For file logging, this is essentially a no-op since we write synchronously
    // In a production environment, you might want to implement async logging with buffering
    this.info('Log flush requested');
  }

  /**
   * Create structured log for performance monitoring
   */
  public performance(operation: string, duration: number, metadata?: any): void {
    this.info('Performance metric', {
      operation,
      duration_ms: duration,
      ...metadata
    });
  }

  /**
   * Create structured log for business events
   */
  public business(event: string, data?: any): void {
    this.info('Business event', {
      event_type: event,
      event_data: data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create audit log entry
   */
  public audit(action: string, userId?: string, resourceId?: string, metadata?: any): void {
    this.info('Audit event', {
      action,
      user_id: userId,
      resource_id: resourceId,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
}