"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerProvider = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const api_logs_1 = require("@opentelemetry/api-logs");
const instrumentation_winston_1 = require("@opentelemetry/instrumentation-winston");
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'thrico-service';
const NODE_ENV = process.env.NODE_ENV || 'development';
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://31.97.206.6:4318';
// ─── Exporters ────────────────────────────────────────────────────────────────
const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
    url: `${OTLP_ENDPOINT}/v1/traces`,
});
const logExporter = new exporter_logs_otlp_http_1.OTLPLogExporter({
    url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || `${OTLP_ENDPOINT}/v1/logs`,
});
// ─── Resource ─────────────────────────────────────────────────────────────────
const resource = new resources_1.Resource({
    [semantic_conventions_1.ATTR_SERVICE_NAME]: SERVICE_NAME,
    'deployment.environment': NODE_ENV,
});
// ─── Logger Provider ──────────────────────────────────────────────────────────
exports.loggerProvider = new sdk_logs_1.LoggerProvider({ resource });
exports.loggerProvider.addLogRecordProcessor(new sdk_logs_1.BatchLogRecordProcessor(logExporter));
// Register globally so Winston instrumentation can bridge logs → OTLP
api_logs_1.logs.setGlobalLoggerProvider(exports.loggerProvider);
// ─── Node SDK ─────────────────────────────────────────────────────────────────
const sdk = new sdk_node_1.NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
        (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
            // File system spans are very noisy; keep disabled unless needed
            '@opentelemetry/instrumentation-fs': {
                enabled: false,
            },
        }),
        // Injects trace/span IDs into every Winston log record and ships logs
        // to the OTLP collector via the global LoggerProvider set above.
        new instrumentation_winston_1.WinstonInstrumentation({
            logHook: (_span, record) => {
                record['resource.service.name'] = SERVICE_NAME;
                record['deployment.environment'] = NODE_ENV;
            },
        }),
    ],
});
// ─── Bootstrap ────────────────────────────────────────────────────────────────
try {
    sdk.start();
    console.log(`[OTel] Instrumentation initialised — service="${SERVICE_NAME}" endpoint="${OTLP_ENDPOINT}"`);
}
catch (err) {
    console.error('[OTel] Failed to initialise instrumentation:', err);
}
// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdownOtel(signal) {
    console.log(`[OTel] Received ${signal} — flushing telemetry…`);
    try {
        await sdk.shutdown();
        await exports.loggerProvider.shutdown();
        console.log('[OTel] SDK shut down successfully');
    }
    catch (err) {
        console.error('[OTel] Error during shutdown:', err);
    }
    finally {
        process.exit(0);
    }
}
process.once('SIGTERM', () => shutdownOtel('SIGTERM'));
process.once('SIGINT', () => shutdownOtel('SIGINT'));
//# sourceMappingURL=instrumentation.js.map