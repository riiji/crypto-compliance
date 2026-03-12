import type { ComplianceCheckResult } from '../../../domain/compliance-check-result.entity';

export const COMPLIANCE_PROVIDER_QUEUE_NAME = 'compliance-provider';
export const COMPLIANCE_PROVIDER_CHECK_JOB_NAME = 'check-address';

export interface ComplianceProviderCheckJobData {
  address: string;
  network: string;
}

export interface ComplianceProviderCheckJobResult extends Omit<
  ComplianceCheckResult,
  'checkedAt'
> {
  checkedAt: string | null;
}
