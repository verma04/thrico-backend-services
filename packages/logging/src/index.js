"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.requestLogger = exports.log = exports.logger = void 0;
var logger_1 = require("./logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return __importDefault(logger_1).default; } });
Object.defineProperty(exports, "log", { enumerable: true, get: function () { return logger_1.log; } });
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "requestLogger", { enumerable: true, get: function () { return middleware_1.requestLogger; } });
Object.defineProperty(exports, "errorLogger", { enumerable: true, get: function () { return middleware_1.errorLogger; } });
//# sourceMappingURL=index.js.map