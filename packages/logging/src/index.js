"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerProvider = exports.errorLogger = exports.requestLogger = exports.morganStream = exports.createChildLogger = exports.log = exports.logger = void 0;
// Core logger + helpers
var logger_1 = require("./logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return __importDefault(logger_1).default; } });
Object.defineProperty(exports, "log", { enumerable: true, get: function () { return logger_1.log; } });
Object.defineProperty(exports, "createChildLogger", { enumerable: true, get: function () { return logger_1.createChildLogger; } });
Object.defineProperty(exports, "morganStream", { enumerable: true, get: function () { return logger_1.morganStream; } });
// Express middleware
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "requestLogger", { enumerable: true, get: function () { return middleware_1.requestLogger; } });
Object.defineProperty(exports, "errorLogger", { enumerable: true, get: function () { return middleware_1.errorLogger; } });
// OpenTelemetry — loggerProvider is needed if a service wants to flush manually,
// e.g. in its own SIGTERM handler.  The SDK is started as a side-effect of
// importing this module, so services must import '@thrico/logging' BEFORE any
// other application code (ideally as the first line of the entry-point).
var instrumentation_1 = require("./instrumentation");
Object.defineProperty(exports, "loggerProvider", { enumerable: true, get: function () { return instrumentation_1.loggerProvider; } });
//# sourceMappingURL=index.js.map