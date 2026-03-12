import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Decoder,
  GlideClient,
  type GlideClientConfiguration,
  TimeUnit,
} from '@valkey/valkey-glide';
import {
  COMPLIANCE_CACHE_PORT,
  type ComplianceCachePort,
} from '../../../application/ports/outbound/compliance-cache.port';
import {
  COMPLIANCE_LOCK_PORT,
  type ComplianceLockPort,
} from '../../../application/ports/outbound/compliance-lock.port';
import type {
  ComplianceAssessmentSource,
  ComplianceCheckResult,
  ComplianceCheckStatus,
  ComplianceRetrievalSource,
  ComplianceSignal,
} from '../../../domain/compliance-check-result.entity';
import { ComplianceProviderRequestError } from '../../../domain/errors/compliance-provider.error';

interface CachedComplianceCheckResult {
  address: string;
  network: string;
  status: ComplianceCheckStatus;
  riskScore: number | null;
  signals: ComplianceSignal[] | null;
  checkedAt: string | null;
  assessmentSource: ComplianceAssessmentSource;
  retrievalSource?: ComplianceRetrievalSource;
  isHighRisk: boolean;
}

@Injectable()
export class ValkeyComplianceCacheAdapter
  implements ComplianceCachePort, ComplianceLockPort, OnModuleDestroy
{
  private readonly valkeyHost =
    process.env.COMPLIANCE_VALKEY_HOST ?? '127.0.0.1';
  private readonly valkeyPort = Number.parseInt(
    process.env.COMPLIANCE_VALKEY_PORT ?? '6379',
    10,
  );
  private readonly valkeyUseTls =
    (process.env.COMPLIANCE_VALKEY_USE_TLS ?? '').toLowerCase() === 'true';
  private readonly valkeyUsername = process.env.COMPLIANCE_VALKEY_USERNAME;
  private readonly valkeyPassword = process.env.COMPLIANCE_VALKEY_PASSWORD;
  private readonly keyPrefix =
    process.env.COMPLIANCE_VALKEY_KEY_PREFIX ?? 'compliance:check';
  private readonly lockPrefix =
    process.env.COMPLIANCE_VALKEY_LOCK_PREFIX ?? `${this.keyPrefix}:lock`;
  private readonly lockTtlMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_VALKEY_LOCK_TTL_MS,
    250,
  );
  private readonly lockWaitTimeoutMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_VALKEY_LOCK_WAIT_TIMEOUT_MS ??
      process.env.COMPLIANCE_VALKEY_LOCK_TIMEOUT_MS,
    10000,
  );
  private readonly lockRetryIntervalMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_VALKEY_LOCK_RETRY_INTERVAL_MS,
    100,
  );

  private clientPromise: Promise<GlideClient> | null = null;

  async get(input: {
    address: string;
    network: string;
  }): Promise<ComplianceCheckResult | null> {
    const client = await this.getClient();
    const cacheKey = this.toCacheKey(input);
    const rawValue = await client.get(cacheKey, { decoder: Decoder.String });

    if (rawValue === null || typeof rawValue !== 'string') {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      return null;
    }

    if (!this.isCachedComplianceResult(parsed)) {
      return null;
    }

    const checkedAt = parsed.checkedAt ? new Date(parsed.checkedAt) : null;
    if (checkedAt && Number.isNaN(checkedAt.getTime())) {
      return null;
    }

    return {
      address: parsed.address,
      network: parsed.network,
      status: parsed.status,
      riskScore: parsed.riskScore,
      signals: parsed.signals,
      checkedAt,
      assessmentSource: parsed.assessmentSource,
      retrievalSource: parsed.retrievalSource ?? 'provider',
      isHighRisk: parsed.isHighRisk,
    };
  }

  async set(
    input: {
      address: string;
      network: string;
    },
    result: ComplianceCheckResult,
    ttlSeconds: number,
  ): Promise<void> {
    const client = await this.getClient();
    const cacheKey = this.toCacheKey(input);
    const payload: CachedComplianceCheckResult = {
      address: result.address,
      network: result.network,
      status: result.status,
      riskScore: result.riskScore,
      signals: result.signals,
      checkedAt: result.checkedAt ? result.checkedAt.toISOString() : null,
      assessmentSource: result.assessmentSource,
      retrievalSource: result.retrievalSource,
      isHighRisk: result.isHighRisk,
    };

    const safeTtlSeconds =
      Number.isInteger(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 3600;

    await client.set(cacheKey, JSON.stringify(payload), {
      expiry: {
        type: TimeUnit.Seconds,
        count: safeTtlSeconds,
      },
    });
  }

  async withAddressLock<T>(
    input: { address: string; network: string },
    action: () => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();
    const lockKey = this.toLockKey(input);
    const lockDeadlineMs = Date.now() + this.lockWaitTimeoutMs;

    while (Date.now() < lockDeadlineMs) {
      const lockToken = randomUUID();
      if (await this.tryAcquireLock(client, lockKey, lockToken)) {
        return this.executeAsLockOwner(client, lockKey, lockToken, action);
      }

      await this.sleep(this.lockRetryIntervalMs);
    }

    throw new ComplianceProviderRequestError(
      'Failed to acquire compliance lock',
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.clientPromise) {
      return;
    }

    const client = await this.clientPromise;
    client.close();
    this.clientPromise = null;
  }

  private async getClient(): Promise<GlideClient> {
    if (!this.clientPromise) {
      const config: GlideClientConfiguration = {
        addresses: [{ host: this.valkeyHost, port: this.valkeyPort }],
        useTLS: this.valkeyUseTls,
        requestTimeout: 5000,
        clientName: 'crypto-compliance',
      };

      if (this.valkeyPassword) {
        config.credentials = this.valkeyUsername
          ? { username: this.valkeyUsername, password: this.valkeyPassword }
          : { password: this.valkeyPassword };
      }

      this.clientPromise = GlideClient.createClient(config).catch(
        (error: unknown) => {
          this.clientPromise = null;
          throw new ComplianceProviderRequestError(
            `Failed to connect to Valkey: ${this.toErrorMessage(error)}`,
          );
        },
      );
    }

    return this.clientPromise;
  }

  private toCacheKey(input: { address: string; network: string }): string {
    return `${this.keyPrefix}:${encodeURIComponent(
      input.network,
    )}:${encodeURIComponent(input.address)}`;
  }

  private toLockKey(input: { address: string; network: string }): string {
    return `${this.lockPrefix}:${encodeURIComponent(
      input.network,
    )}:${encodeURIComponent(input.address)}`;
  }

  private async executeAsLockOwner<T>(
    client: GlideClient,
    lockKey: string,
    lockToken: string,
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      return await action();
    } finally {
      await this.releaseLock(client, lockKey, lockToken);
    }
  }

  private async tryAcquireLock(
    client: GlideClient,
    lockKey: string,
    lockToken: string,
  ): Promise<boolean> {
    const result = await client.set(lockKey, lockToken, {
      conditionalSet: 'onlyIfDoesNotExist',
      expiry: {
        type: TimeUnit.Milliseconds,
        count: this.lockTtlMs,
      },
    });

    return result === 'OK';
  }

  private async releaseLock(
    client: GlideClient,
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    try {
      await client.customCommand([
        'EVAL',
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
        '1',
        lockKey,
        lockToken,
      ]);
    } catch {
      // best-effort unlock
    }
  }

  private isCachedComplianceResult(
    value: unknown,
  ): value is CachedComplianceCheckResult {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const record = value as Record<string, unknown>;
    if (typeof record['address'] !== 'string') {
      return false;
    }
    if (typeof record['network'] !== 'string') {
      return false;
    }
    if (record['status'] !== 'ready' && record['status'] !== 'in_progress') {
      return false;
    }
    if (
      record['riskScore'] !== null &&
      typeof record['riskScore'] !== 'number'
    ) {
      return false;
    }
    if (record['signals'] !== null && !Array.isArray(record['signals'])) {
      return false;
    }
    if (
      record['checkedAt'] !== null &&
      typeof record['checkedAt'] !== 'string'
    ) {
      return false;
    }
    if (
      record['assessmentSource'] !== 'provider' &&
      record['assessmentSource'] !== 'blacklist' &&
      record['assessmentSource'] !== 'whitelist'
    ) {
      return false;
    }
    if (
      record['retrievalSource'] !== undefined &&
      record['retrievalSource'] !== 'provider' &&
      record['retrievalSource'] !== 'cache' &&
      record['retrievalSource'] !== 'policy'
    ) {
      return false;
    }
    if (typeof record['isHighRisk'] !== 'boolean') {
      return false;
    }

    return true;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  private parsePositiveInteger(
    rawValue: string | undefined,
    fallback: number,
  ): number {
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private async sleep(milliseconds: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}

export const ValkeyComplianceCacheAdapterProvider = {
  provide: COMPLIANCE_CACHE_PORT,
  useExisting: ValkeyComplianceCacheAdapter,
};

export const ValkeyComplianceLockAdapterProvider = {
  provide: COMPLIANCE_LOCK_PORT,
  useExisting: ValkeyComplianceCacheAdapter,
};
