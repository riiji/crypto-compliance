import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import {
  COMPLIANCE_IDEMPOTENCY_PORT,
  type ComplianceIdempotencyPort,
  type IdempotencyExecutionResult,
} from '../../../application/ports/outbound/compliance-idempotency.port';
import {
  COMPLIANCE_POLICY_MUTATION_HISTORY_PORT,
  type CompliancePolicyMutationHistoryIdempotencyRecord,
  type CompliancePolicyMutationHistoryPort,
} from '../../../application/ports/outbound/compliance-policy-mutation-history.port';

@Injectable()
export class PostgresComplianceIdempotencyAdapter implements ComplianceIdempotencyPort {
  private readonly pollIntervalMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_IDEMPOTENCY_POLL_INTERVAL_MS,
    50,
  );

  private readonly waitTimeoutMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_IDEMPOTENCY_WAIT_TIMEOUT_MS,
    30_000,
  );

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(COMPLIANCE_POLICY_MUTATION_HISTORY_PORT)
    private readonly compliancePolicyMutationHistory: CompliancePolicyMutationHistoryPort,
  ) {}

  async executeOnce<T>(input: {
    key: string;
    requestHash: string;
    action: () => Promise<T>;
  }): Promise<IdempotencyExecutionResult<T>> {
    const key = input.key.trim();
    const requestHash = input.requestHash.trim();
    const lockKey = this.toLockKeyParts(key);
    const deadline = Date.now() + this.waitTimeoutMs;

    while (Date.now() < deadline) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      let lockHeld = false;

      try {
        lockHeld = await this.tryAcquireLock(queryRunner, lockKey);
        if (!lockHeld) {
          continue;
        }

        const existing =
          await this.compliancePolicyMutationHistory.findByIdempotencyKey(key);
        if (existing) {
          this.assertSameRequestHash(existing.requestHash, requestHash);
          return {
            result: this.toReplayResult<T>(existing),
            replayed: true,
          };
        }

        const result = await input.action();
        return {
          result,
          replayed: false,
        };
      } finally {
        if (lockHeld) {
          await this.releaseLock(queryRunner, lockKey);
        }

        await queryRunner.release();
      }
    }

    throw new ConflictException(
      'Idempotency key request is still in progress, retry later',
    );
  }

  private toReplayResult<T>(
    record: CompliancePolicyMutationHistoryIdempotencyRecord,
  ): T {
    return {
      address: record.address,
      network: record.network,
      policy: record.policy,
      action: record.action,
      changed: record.changed,
    } as T;
  }

  private async tryAcquireLock(
    queryRunner: QueryRunner,
    lockKey: readonly [number, number],
  ): Promise<boolean> {
    const parameters = [...lockKey];
    const rawResult = await queryRunner.query(
      'SELECT pg_try_advisory_lock($1, $2) AS locked',
      parameters,
    );
    const result = rawResult as unknown as Array<{
      locked?: boolean | 't' | 'f' | 1 | 0;
    }>;

    const value = result[0]?.locked;
    if (value === true || value === 't' || value === 1) {
      return true;
    }

    await this.sleep(this.pollIntervalMs);
    return false;
  }

  private async releaseLock(
    queryRunner: QueryRunner,
    lockKey: readonly [number, number],
  ): Promise<void> {
    try {
      const parameters = [...lockKey];
      await queryRunner.query('SELECT pg_advisory_unlock($1, $2)', parameters);
    } catch {
      // best-effort unlock
    }
  }

  private toLockKeyParts(rawKey: string): readonly [number, number] {
    const digest = createHash('sha256').update(rawKey).digest();
    return [digest.readInt32BE(0), digest.readInt32BE(4)] as const;
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

export const PostgresComplianceIdempotencyAdapterProvider = {
  provide: COMPLIANCE_IDEMPOTENCY_PORT,
  useExisting: PostgresComplianceIdempotencyAdapter,
};
