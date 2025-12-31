"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.requestLogger = void 0;
const express_winston_1 = __importDefault(require("express-winston"));
const winston_1 = __importDefault(require("winston"));
const shared_1 = require("@thrico/shared");
// Request logging middleware
exports.requestLogger = express_winston_1.default.logger({
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
    ],
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    meta: true,
    msg: 'HTTP {{req.method}} {{req.url}}',
    expressFormat: true,
    colorize: shared_1.ENV.NODE_ENV !== 'production',
    ignoreRoute: (req, res) => {
        // Ignore health check endpoints
        return req.url === '/health' || req.url === '/ping';
    },
    dynamicMeta: (req, res) => {
        return {
            requestId: req.id,
            userId: req.user?.id,
            ip: req.ip,
        };
    },
});
// Error logging middleware
exports.errorLogger = express_winston_1.default.errorLogger({
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
    ],
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
});
//# sourceMappingURL=middleware.js.map