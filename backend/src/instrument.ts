import * as Sentry from '@sentry/nestjs';

function parseRate(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return undefined;
  }

  return parsed;
}

const configuredTraceSampleRate = parseRate(
  process.env.SENTRY_TRACES_SAMPLE_RATE,
);
const configuredProfileSampleRate = parseRate(
  process.env.SENTRY_PROFILES_SAMPLE_RATE,
);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  // Tracing is enabled by default for observability; override via env if needed.
  tracesSampleRate: configuredTraceSampleRate ?? 0.1,
  profilesSampleRate: configuredProfileSampleRate,
});
