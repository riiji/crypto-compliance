import type { ComplianceAddressPolicy } from './compliance-address-policy.port';
import type { CompliancePolicyMutationAction } from '../inbound/mutate-compliance-address-policy.use-case';

export const COMPLIANCE_POLICY_MUTATION_HISTORY_PORT = Symbol(
  'COMPLIANCE_POLICY_MUTATION_HISTORY_PORT',
);

export interface CompliancePolicyMutationHistoryRecord {
  address: string;
  network: string;
  policy: ComplianceAddressPolicy;
  action: CompliancePolicyMutationAction;
  changed: boolean;
  idempotencyKey: string;
  requestedBy: string | null;
  createdAt: Date;
}

export interface CompliancePolicyMutationHistoryAppendRecord extends CompliancePolicyMutationHistoryRecord {
  requestHash?: string | null;
}

export interface CompliancePolicyMutationHistoryIdempotencyRecord extends CompliancePolicyMutationHistoryRecord {
  requestHash: string;
}

export interface CompliancePolicyMutationHistoryPort {
  append(record: CompliancePolicyMutationHistoryAppendRecord): Promise<void>;

  list(limit: number): Promise<CompliancePolicyMutationHistoryRecord[]>;

  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<CompliancePolicyMutationHistoryIdempotencyRecord | null>;
}
