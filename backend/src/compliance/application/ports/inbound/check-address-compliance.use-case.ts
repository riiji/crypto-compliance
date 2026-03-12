import type { ComplianceCheckResult } from '../../../domain/compliance-check-result.entity';

export const CHECK_ADDRESS_COMPLIANCE_USE_CASE = Symbol(
  'CHECK_ADDRESS_COMPLIANCE_USE_CASE',
);

export interface CheckAddressComplianceUseCase {
  execute(input: {
    address: string;
    network: string;
  }): Promise<ComplianceCheckResult>;
}
