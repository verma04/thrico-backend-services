import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'thrico-service';
const NODE_ENV = process.env.NODE_ENV || 'development';

const OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://31.97.206.6:4318';

// ─── Exporters ────────────────────────────────────────────────────────────────

const traceExporter = new OTLPTraceExporter({
  url: `${OTLP_ENDPOINT}/v1/traces`,
});

const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || `${OTLP_ENDPOINT}/v1/logs`,
});

// ─── Resource ─────────────────────────────────────────────────────────────────

const resource = new Resource({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  'deployment.environment': NODE_ENV,
});

// ─── Logger Provider ──────────────────────────────────────────────────────────

export const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

// Register globally so Winston instrumentation can bridge logs → OTLP
logs.setGlobalLoggerProvider(loggerProvider);

// ─── Node SDK ─────────────────────────────────────────────────────────────────

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // File system spans are very noisy; keep disabled unless needed
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
    // Injects trace/span IDs into every Winston log record and ships logs
    // to the OTLP collector via the global LoggerProvider set above.
    new WinstonInstrumentation({
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
} catch (err) {
  console.error('[OTel] Failed to initialise instrumentation:', err);
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdownOtel(signal: string) {
  console.log(`[OTel] Received ${signal} — flushing telemetry…`);
  try {
    await sdk.shutdown();
    await loggerProvider.shutdown();
    console.log('[OTel] SDK shut down successfully');
  } catch (err) {
    console.error('[OTel] Error during shutdown:', err);
  } finally {
    process.exit(0);
  }
}

process.once('SIGTERM', () => shutdownOtel('SIGTERM'));
process.once('SIGINT', () => shutdownOtel('SIGINT'));
