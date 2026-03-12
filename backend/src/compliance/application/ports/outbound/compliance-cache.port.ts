import type { ComplianceCheckResult } from '../../../domain/compliance-check-result.entity';

export const COMPLIANCE_CACHE_PORT = Symbol('COMPLIANCE_CACHE_PORT');

export interface ComplianceCachePort {
  get(input: {
    address: string;
    network: string;
  }): Promise<ComplianceCheckResult | null>;

  set(
    input: {
      address: string;
      network: string;
    },
    result: ComplianceCheckResult,
    ttlSeconds: number,
  ): Promise<void>;
}
