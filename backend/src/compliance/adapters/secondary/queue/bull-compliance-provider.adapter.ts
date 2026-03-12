import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { SentryTraced } from '@sentry/nestjs';
import { Queue, QueueEvents } from 'bullmq';
import {
  COMPLIANCE_PROVIDER_PORT,
  type ComplianceProviderPort,
} from '../../../application/ports/outbound/compliance-provider.port';
import type { ComplianceCheckResult } from '../../../domain/compliance-check-result.entity';
import { ComplianceProviderRequestError } from '../../../domain/errors/compliance-provider.error';
import {
  COMPLIANCE_PROVIDER_CHECK_JOB_NAME,
  COMPLIANCE_PROVIDER_QUEUE_NAME,
  type ComplianceProviderCheckJobData,
  type ComplianceProviderCheckJobResult,
} from './compliance-provider.queue';

@Injectable()
export class BullComplianceProviderAdapter
  implements ComplianceProviderPort, OnModuleInit, OnModuleDestroy
{
  private readonly maxAttempts = this.parsePositiveInteger(
    process.env.COMPLIANCE_PROVIDER_MAX_RETRIES,
    5,
  );

  private readonly retryDelayMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_PROVIDER_RETRY_DELAY_MS,
    500,
  );

  private readonly waitTimeoutMs = this.parsePositiveInteger(
    process.env.COMPLIANCE_PROVIDER_QUEUE_WAIT_TIMEOUT_MS,
    60_000,
  );

  private queueEvents: QueueEvents | null = null;

  constructor(
    @InjectQueue(COMPLIANCE_PROVIDER_QUEUE_NAME)
    private readonly queue: Queue<
      ComplianceProviderCheckJobData,
      ComplianceProviderCheckJobResult
    >,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queueEvents = new QueueEvents(COMPLIANCE_PROVIDER_QUEUE_NAME, {
      connection: this.queue.opts.connection,
    });
    await this.queueEvents.waitUntilReady();
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.queueEvents) {
      return;
    }

    await this.queueEvents.close();
    this.queueEvents = null;
  }

  @SentryTraced('compliance.provider.queue.enqueue-and-wait')
  async checkAddress(input: {
    address: string;
    network: string;
  }): Promise<ComplianceCheckResult> {
    const normalizedInput = {
      address: input.address.trim(),
      network: input.network.trim(),
    };

    const job = await this.queue.add(
      COMPLIANCE_PROVIDER_CHECK_JOB_NAME,
      normalizedInput,
      {
        attempts: this.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: this.retryDelayMs,
        },
      },
    );

    const queueEvents = this.queueEvents;
    if (!queueEvents) {
      throw new ComplianceProviderRequestError(
        'Compliance provider queue events are not initialized',
      );
    }

    try {
      const result = await job.waitUntilFinished(
        queueEvents,
        this.waitTimeoutMs,
      );
      return this.toDomainResult(result);
    } catch (error) {
      throw new ComplianceProviderRequestError(
        `Compliance provider job failed after ${this.maxAttempts} attempts: ${this.toErrorMessage(
          error,
        )}`,
      );
    }
  }

  private toDomainResult(
    result: ComplianceProviderCheckJobResult,
  ): ComplianceCheckResult {
    let checkedAt: Date | null = null;
    if (result.checkedAt) {
      checkedAt = new Date(result.checkedAt);
      if (Number.isNaN(checkedAt.getTime())) {
        throw new ComplianceProviderRequestError(
          'Compliance provider queue returned invalid checkedAt value',
        );
      }
    }

    return {
      ...result,
      checkedAt,
    };
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
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
}

export const BullComplianceProviderAdapterProvider = {
  provide: COMPLIANCE_PROVIDER_PORT,
  useExisting: BullComplianceProviderAdapter,
};
