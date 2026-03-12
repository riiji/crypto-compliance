import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { SuwardComplianceProviderAdapter } from '../http/suward-compliance-provider.adapter';
import {
  COMPLIANCE_PROVIDER_QUEUE_NAME,
  type ComplianceProviderCheckJobData,
  type ComplianceProviderCheckJobResult,
} from './compliance-provider.queue';

@Processor(COMPLIANCE_PROVIDER_QUEUE_NAME)
export class ComplianceProviderQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ComplianceProviderQueueProcessor.name);

  constructor(
    private readonly suwardComplianceProviderAdapter: SuwardComplianceProviderAdapter,
  ) {
    super();
  }

  async process(
    job: Job<ComplianceProviderCheckJobData, ComplianceProviderCheckJobResult>,
  ): Promise<ComplianceProviderCheckJobResult> {
    try {
      const result = await this.suwardComplianceProviderAdapter.checkAddress(
        job.data,
      );

      return {
        ...result,
        checkedAt: result.checkedAt ? result.checkedAt.toISOString() : null,
      };
    } catch (error) {
      const maxAttempts = job.opts.attempts ?? 1;
      const currentAttempt = job.attemptsMade + 1;
      if (currentAttempt >= maxAttempts) {
        // there should be notification to slack
        this.logger.error(
          `Compliance provider job fully failed after ${currentAttempt} attempts for ${job.data.network}:${job.data.address}`,
        );
      }

      throw error;
    }
  }
}
