import type {
  CompliancePolicyMutationAction,
  MutateComplianceAddressPolicyResult,
} from './mutate-compliance-address-policy.use-case';
import type { ComplianceAddressPolicy } from '../outbound/compliance-address-policy.port';

export const SECURE_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE = Symbol(
  'SECURE_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE',
);

export interface SecureMutateComplianceAddressPolicyInput {
  address: string;
  network: string;
  policy: ComplianceAddressPolicy;
  action: CompliancePolicyMutationAction;
  confirmPolicySwitch?: boolean;
  idempotencyKey?: string | null;
  signature: string;
  timestamp: string;
  requestedBy?: string | null;
}

export interface SecureMutateComplianceAddressPolicyResult extends MutateComplianceAddressPolicyResult {
  idempotencyKey: string;
  replayed: boolean;
}

export interface SecureMutateComplianceAddressPolicyUseCase {
  execute(
    input: SecureMutateComplianceAddressPolicyInput,
  ): Promise<SecureMutateComplianceAddressPolicyResult>;
}
