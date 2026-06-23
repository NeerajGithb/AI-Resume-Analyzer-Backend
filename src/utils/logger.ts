type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry extends LogContext {
  timestamp: string;
  level: string;
  message: string;
}

class Logger {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  private write(level: LogLevel, message: string, context?: LogContext): void {
    // Suppress debug logs in production
    if (level === 'debug' && this.isProduction) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...context,
    };

    if (this.isProduction) {
      // Structured JSON — pipe-friendly for log aggregators (Datadog, CloudWatch, etc.)
      const line = JSON.stringify(entry) + '\n';
      if (level === 'error') process.stderr.write(line);
      else process.stdout.write(line);
    } else {
      // Human-readable for local development
      const prefix = `[${entry.timestamp}] [${entry.level}] ${message}`;
      const hasContext = context && Object.keys(context).length > 0;
      if (level === 'error') console.error(prefix, hasContext ? context : '');
      else console.log(prefix, hasContext ? context : '');
    }
  }

  info(message: string, context?: LogContext): void { this.write('info', message, context); }
  warn(message: string, context?: LogContext): void { this.write('warn', message, context); }
  error(message: string, context?: LogContext): void { this.write('error', message, context); }
  debug(message: string, context?: LogContext): void { this.write('debug', message, context); }
}

export const logger = new Logger();
