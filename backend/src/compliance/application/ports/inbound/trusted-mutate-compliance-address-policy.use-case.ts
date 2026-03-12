import type {
  CompliancePolicyMutationAction,
  MutateComplianceAddressPolicyResult,
} from './mutate-compliance-address-policy.use-case';
import type { ComplianceAddressPolicy } from '../outbound/compliance-address-policy.port';

export const TRUSTED_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE = Symbol(
  'TRUSTED_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE',
);

export interface TrustedMutateComplianceAddressPolicyInput {
  address: string;
  network: string;
  policy: ComplianceAddressPolicy;
  action: CompliancePolicyMutationAction;
  confirmPolicySwitch?: boolean;
  idempotencyKey?: string | null;
  requestedBy?: string | null;
}

export interface TrustedMutateComplianceAddressPolicyResult extends MutateComplianceAddressPolicyResult {
  idempotencyKey: string;
  replayed: boolean;
}

export interface TrustedMutateComplianceAddressPolicyUseCase {
  execute(
    input: TrustedMutateComplianceAddressPolicyInput,
  ): Promise<TrustedMutateComplianceAddressPolicyResult>;
}
