import { Inject, Injectable } from '@nestjs/common';
import {
  LIST_COMPLIANCE_POLICY_MUTATION_HISTORY_USE_CASE,
  type ListCompliancePolicyMutationHistoryUseCase,
} from '../ports/inbound/list-compliance-policy-mutation-history.use-case';
import {
  COMPLIANCE_POLICY_MUTATION_HISTORY_PORT,
  type CompliancePolicyMutationHistoryPort,
  type CompliancePolicyMutationHistoryRecord,
} from '../ports/outbound/compliance-policy-mutation-history.port';

@Injectable()
export class ListCompliancePolicyMutationHistoryService implements ListCompliancePolicyMutationHistoryUseCase {
  private readonly defaultLimit = 100;
  private readonly maxLimit = 1000;

  constructor(
    @Inject(COMPLIANCE_POLICY_MUTATION_HISTORY_PORT)
    private readonly compliancePolicyMutationHistory: CompliancePolicyMutationHistoryPort,
  ) {}

  async execute(input?: {
    limit?: number;
  }): Promise<CompliancePolicyMutationHistoryRecord[]> {
    const rawLimit = input?.limit;
    const safeLimit =
      Number.isInteger(rawLimit) && rawLimit! > 0
        ? Math.min(rawLimit!, this.maxLimit)
        : this.defaultLimit;

    return this.compliancePolicyMutationHistory.list(safeLimit);
  }
}

export const ListCompliancePolicyMutationHistoryProvider = {
  provide: LIST_COMPLIANCE_POLICY_MUTATION_HISTORY_USE_CASE,
  useExisting: ListCompliancePolicyMutationHistoryService,
};
