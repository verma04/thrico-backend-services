"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("@thrico/shared");
const LOG_DIR = shared_1.ENV.LOG_DIR;
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
winston_1.default.addColors(customLevels.colors);
// Define log format
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json());
// Console format for development
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
        metaString = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
}));
// Create transports
const transports = [];
// Console transport (always enabled)
transports.push(new winston_1.default.transports.Console({
    format: shared_1.ENV.NODE_ENV === 'production' ? logFormat : consoleFormat,
}));
// File transports (production and development)
if (shared_1.ENV.NODE_ENV !== 'test') {
    // Error logs
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(LOG_DIR, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
    }));
    // Combined logs
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(LOG_DIR, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
    }));
    // HTTP logs
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(LOG_DIR, 'http-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '7d',
        zippedArchive: true,
    }));
}
// Create logger instance
const logger = winston_1.default.createLogger({
    levels: customLevels.levels,
    level: shared_1.ENV.LOG_LEVEL,
    format: logFormat,
    transports,
    exitOnError: false,
});
// Export logger methods
exports.log = {
    error: (message, meta) => logger.error(message, meta),
    warn: (message, meta) => logger.warn(message, meta),
    info: (message, meta) => logger.info(message, meta),
    http: (message, meta) => logger.http(message, meta),
    debug: (message, meta) => logger.debug(message, meta),
};
exports.default = logger;
//# sourceMappingURL=logger.js.map