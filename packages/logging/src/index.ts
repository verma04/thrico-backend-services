// Core logger + helpers
export { default as logger, log, createChildLogger, morganStream } from './logger';

// Express middleware
export { requestLogger, errorLogger } from './middleware';

// OpenTelemetry — loggerProvider is needed if a service wants to flush manually,
// e.g. in its own SIGTERM handler.  The SDK is started as a side-effect of
// importing this module, so services must import '@thrico/logging' BEFORE any
// other application code (ideally as the first line of the entry-point).
export { loggerProvider } from './instrumentation';
