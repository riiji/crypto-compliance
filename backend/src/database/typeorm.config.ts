import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

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

export function createTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    ...createTypeOrmDataSourceOptions(),
    autoLoadEntities: true,
  };
}

export function createTypeOrmDataSourceOptions(): DataSourceOptions {
  const sslEnabled = parseBoolean(process.env.COMPLIANCE_DB_SSL, false);

  return {
    type: 'postgres',
    host: process.env.COMPLIANCE_DB_HOST ?? 'localhost',
    port: parseInteger(process.env.COMPLIANCE_DB_PORT, 5432),
    username: process.env.COMPLIANCE_DB_USER ?? 'compliance',
    password: process.env.COMPLIANCE_DB_PASSWORD ?? 'compliance',
    database: process.env.COMPLIANCE_DB_NAME ?? 'compliance',
    synchronize: false,
    logging: parseBoolean(process.env.COMPLIANCE_DB_LOGGING, false),
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  };
}
