import expressWinston from 'express-winston';
import winston from 'winston';
import { Request, Response } from 'express';
import { ENV } from '@thrico/shared';

// Request logging middleware
export const requestLogger = expressWinston.logger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: ENV.NODE_ENV !== 'production',
  ignoreRoute: (req: Request, res: Response) => {
    // Ignore health check endpoints
    return req.url === '/health' || req.url === '/ping';
  },
  dynamicMeta: (req: Request, res: Response) => {
    return {
      requestId: (req as any).id,
      userId: (req as any).user?.id,
      ip: req.ip,
    };
  },
});

// Error logging middleware
export const errorLogger: any = expressWinston.errorLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});
