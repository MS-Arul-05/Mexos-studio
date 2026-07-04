/**
 * OpenTelemetry bootstrap. MUST be imported before any instrumented module
 * (http/express/pg) so auto-instrumentation can patch them — hence it is the very
 * first import in server.ts and self-initializes on load.
 *
 * No-op unless OTEL_ENABLED=true, so dev/test/CI are completely unaffected. The
 * exporter endpoint comes from the standard OTEL_EXPORTER_OTLP_ENDPOINT env var
 * (e.g. http://otel-collector:4318/v1/traces); service name from OTEL_SERVICE_NAME.
 *
 * The heavy SDK is loaded lazily via require so it never enters the bundle/hot path
 * when disabled.
 */
import 'dotenv/config';

function truthy(v: string | undefined): boolean {
  return v === 'true' || v === '1';
}

if (truthy(process.env.OTEL_ENABLED)) {
  process.env.OTEL_SERVICE_NAME ||= 'tshirt-api';
  /* eslint-disable @typescript-eslint/no-require-imports -- lazy-load the heavy SDK only when enabled */
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs spans are extremely noisy and rarely useful.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  // eslint-disable-next-line no-console
  console.log('[otel] tracing started');

  const shutdown = (): void => {
    sdk.shutdown().finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
