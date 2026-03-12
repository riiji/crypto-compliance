import type { BullRootModuleOptions } from '@nestjs/bullmq';

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return fallback;
}

export function createBullmqConfig(): BullRootModuleOptions {
  const useTls = parseBoolean(
    process.env.COMPLIANCE_BULL_USE_TLS ??
      process.env.COMPLIANCE_VALKEY_USE_TLS,
    false,
  );

  return {
    connection: {
      host:
        process.env.COMPLIANCE_BULL_HOST ??
        process.env.COMPLIANCE_VALKEY_HOST ??
        '127.0.0.1',
      port: parseInteger(
        process.env.COMPLIANCE_BULL_PORT ?? process.env.COMPLIANCE_VALKEY_PORT,
        6379,
      ),
      username:
        process.env.COMPLIANCE_BULL_USERNAME ??
        process.env.COMPLIANCE_VALKEY_USERNAME,
      password:
        process.env.COMPLIANCE_BULL_PASSWORD ??
        process.env.COMPLIANCE_VALKEY_PASSWORD,
      tls: useTls ? { rejectUnauthorized: false } : undefined,
    },
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  };
}
