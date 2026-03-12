import { ConflictException, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  Decoder,
  GlideClient,
  type GlideClientConfiguration,
  TimeUnit,
} from '@valkey/valkey-glide';
import {
  COMPLIANCE_IDEMPOTENCY_PORT,
  type ComplianceIdempotencyPort,
  type IdempotencyExecutionResult,
} from '../../../application/ports/outbound/compliance-idempotency.port';

interface InProgressIdempotencyValue {
  status: 'in_progress';
  requestHash: string;
}

interface CompletedIdempotencyValue {
  status: 'completed';
  requestHash: string;
  result: unknown;
}

type IdempotencyValue = InProgressIdempotencyValue | CompletedIdempotencyValue;

@Injectable()
export class ValkeyComplianceIdempotencyAdapter
  implements ComplianceIdempotencyPort, OnModuleDestroy
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
    process.env.COMPLIANCE_IDEMPOTENCY_KEY_PREFIX ?? 'compliance:idempotency';

  private readonly pollIntervalMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_IDEMPOTENCY_POLL_INTERVAL_MS,
    50,
  );
  private readonly waitTimeoutMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_IDEMPOTENCY_WAIT_TIMEOUT_MS,
    30_000,
  );

  private clientPromise: Promise<GlideClient> | null = null;

  async executeOnce<T>(input: {
    key: string;
    requestHash: string;
    ttlSeconds: number;
    action: () => Promise<T>;
  }): Promise<IdempotencyExecutionResult<T>> {
    const client = await this.getClient();
    const key = this.toKey(input.key);
    const requestHash = input.requestHash.trim();
    const ttlSeconds = this.safeTtlSeconds(input.ttlSeconds);

    if (await this.tryCreateInProgress(client, key, requestHash, ttlSeconds)) {
      return this.executeAsOwner(client, key, requestHash, ttlSeconds, input);
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < this.waitTimeoutMs) {
      const existing = await this.getRecord(client, key);
      if (!existing) {
        if (
          await this.tryCreateInProgress(client, key, requestHash, ttlSeconds)
        ) {
          return this.executeAsOwner(
            client,
            key,
            requestHash,
            ttlSeconds,
            input,
          );
        }

        await this.sleep(this.pollIntervalMs);
        continue;
      }

      this.assertSameRequestHash(existing.requestHash, requestHash);
      if (existing.status === 'completed') {
        return {
          result: existing.result as T,
          replayed: true,
        };
      }

      await this.sleep(this.pollIntervalMs);
    }

    throw new ConflictException(
      'Idempotency key request is still in progress, retry later',
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

  private async executeAsOwner<T>(
    client: GlideClient,
    key: string,
    requestHash: string,
    ttlSeconds: number,
    input: {
      key: string;
      requestHash: string;
      ttlSeconds: number;
      action: () => Promise<T>;
    },
  ): Promise<IdempotencyExecutionResult<T>> {
    try {
      const result = await input.action();
      await this.markCompleted(client, key, requestHash, result, ttlSeconds);
      return {
        result,
        replayed: false,
      };
    } catch (error) {
      await this.releaseOnFailure(client, key, requestHash);
      throw error;
    }
  }

  private async getClient(): Promise<GlideClient> {
    if (!this.clientPromise) {
      const config: GlideClientConfiguration = {
        addresses: [{ host: this.valkeyHost, port: this.valkeyPort }],
        useTLS: this.valkeyUseTls,
        requestTimeout: 5000,
        clientName: 'crypto-compliance-idempotency',
      };

      if (this.valkeyPassword) {
        config.credentials = this.valkeyUsername
          ? { username: this.valkeyUsername, password: this.valkeyPassword }
          : { password: this.valkeyPassword };
      }

      this.clientPromise = GlideClient.createClient(config).catch(
        (error: unknown) => {
          this.clientPromise = null;
          throw error;
        },
      );
    }

    return this.clientPromise;
  }

  private async tryCreateInProgress(
    client: GlideClient,
    key: string,
    requestHash: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const value: InProgressIdempotencyValue = {
      status: 'in_progress',
      requestHash,
    };

    const result = await client.set(key, JSON.stringify(value), {
      conditionalSet: 'onlyIfDoesNotExist',
      expiry: {
        type: TimeUnit.Seconds,
        count: ttlSeconds,
      },
    });

    return result === 'OK';
  }

  private async getRecord(
    client: GlideClient,
    key: string,
  ): Promise<IdempotencyValue | null> {
    const raw = await client.get(key, { decoder: Decoder.String });
    if (!raw || typeof raw !== 'string') {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (typeof parsed !== 'object' || !parsed) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (typeof record['requestHash'] !== 'string') {
      return null;
    }

    if (record['status'] === 'in_progress') {
      return {
        status: 'in_progress',
        requestHash: record['requestHash'],
      };
    }

    if (record['status'] === 'completed') {
      return {
        status: 'completed',
        requestHash: record['requestHash'],
        result: record['result'],
      };
    }

    return null;
  }

  private async markCompleted<T>(
    client: GlideClient,
    key: string,
    requestHash: string,
    result: T,
    ttlSeconds: number,
  ): Promise<void> {
    const completed: CompletedIdempotencyValue = {
      status: 'completed',
      requestHash,
      result,
    };

    await client.customCommand([
      'EVAL',
      [
        'local current = redis.call("get", KEYS[1])',
        'if not current then return 0 end',
        'local ok, data = pcall(cjson.decode, current)',
        'if not ok or data["requestHash"] ~= ARGV[1] then return -1 end',
        'redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[3])',
        'return 1',
      ].join(' '),
      '1',
      key,
      requestHash,
      JSON.stringify(completed),
      ttlSeconds.toString(),
    ]);
  }

  private async releaseOnFailure(
    client: GlideClient,
    key: string,
    requestHash: string,
  ): Promise<void> {
    await client.customCommand([
      'EVAL',
      [
        'local current = redis.call("get", KEYS[1])',
        'if not current then return 0 end',
        'local ok, data = pcall(cjson.decode, current)',
        'if not ok or data["requestHash"] ~= ARGV[1] then return -1 end',
        'return redis.call("del", KEYS[1])',
      ].join(' '),
      '1',
      key,
      requestHash,
    ]);
  }

  private toKey(raw: string): string {
    return `${this.keyPrefix}:${encodeURIComponent(raw.trim())}`;
  }

  private assertSameRequestHash(
    actualRequestHash: string,
    incomingRequestHash: string,
  ): void {
    if (actualRequestHash === incomingRequestHash) {
      return;
    }

    throw new ConflictException(
      'Idempotency key has already been used for another request',
    );
  }

  private safeTtlSeconds(raw: number): number {
    if (Number.isInteger(raw) && raw > 0) {
      return raw;
    }

    return 86400;
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

export const ValkeyComplianceIdempotencyAdapterProvider = {
  provide: COMPLIANCE_IDEMPOTENCY_PORT,
  useExisting: ValkeyComplianceIdempotencyAdapter,
};
