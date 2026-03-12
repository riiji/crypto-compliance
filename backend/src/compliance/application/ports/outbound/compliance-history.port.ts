import type { ComplianceCheckResult } from '../../../domain/compliance-check-result.entity';

export const COMPLIANCE_HISTORY_PORT = Symbol('COMPLIANCE_HISTORY_PORT');

export interface ComplianceHistoryPort {
  append(result: ComplianceCheckResult): Promise<void>;
}
