import type { CompliancePolicyMutationHistoryRecord } from '../outbound/compliance-policy-mutation-history.port';

export const LIST_COMPLIANCE_POLICY_MUTATION_HISTORY_USE_CASE = Symbol(
  'LIST_COMPLIANCE_POLICY_MUTATION_HISTORY_USE_CASE',
);

export interface ListCompliancePolicyMutationHistoryUseCase {
  execute(input?: {
    limit?: number;
  }): Promise<CompliancePolicyMutationHistoryRecord[]>;
}
