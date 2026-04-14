import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { ENV } from '@thrico/shared';

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'thrico-service';

const LOG_DIR = ENV.LOG_DIR;

// Define custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: ENV.NODE_ENV === 'production' ? logFormat : consoleFormat,
  })
);

// File transports (production and development)
if (ENV.NODE_ENV !== 'test') {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );

  // HTTP logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: ENV.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: SERVICE_NAME },
  transports,
  exitOnError: false,
});

// ─── Child logger factory ─────────────────────────────────────────────────────
// Creates a child logger pre-tagged with a module/component label so every
// log line emitted by that module carries consistent metadata — useful when
// correlating across multiple services in the OTel trace viewer.
//
//   const moduleLog = createChildLogger('UserService');
//   moduleLog.info('user created', { userId });

export function createChildLogger(
  module: string,
  extra?: Record<string, unknown>
): winston.Logger {
  return logger.child({ module, ...extra });
}

// ─── Morgan-compatible stream ─────────────────────────────────────────────────
// Pass this to Morgan so HTTP request logs are routed through Winston
// (and therefore also forwarded to the OTel OTLP log collector).
//
//   app.use(morgan('combined', { stream: morganStream }));

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// ─── Flat convenience exports ─────────────────────────────────────────────────
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  http: (message: string, meta?: any) => logger.http(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
};

export default logger;
