import type { ComplianceCheckResult } from '../../../domain/compliance-check-result.entity';

export const COMPLIANCE_PROVIDER_PORT = Symbol('COMPLIANCE_PROVIDER_PORT');

export interface ComplianceProviderPort {
  checkAddress(input: {
    address: string;
    network: string;
  }): Promise<ComplianceCheckResult>;
}
