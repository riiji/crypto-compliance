import type { ComplianceAddressPolicy } from '../outbound/compliance-address-policy.port';

export const MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE = Symbol(
  'MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE',
);

export type CompliancePolicyMutationAction = 'add' | 'remove';

export interface MutateComplianceAddressPolicyInput {
  address: string;
  network: string;
  policy: ComplianceAddressPolicy;
  action: CompliancePolicyMutationAction;
  confirmPolicySwitch?: boolean;
}

export interface MutateComplianceAddressPolicyResult {
  address: string;
  network: string;
  policy: ComplianceAddressPolicy;
  action: CompliancePolicyMutationAction;
  changed: boolean;
}

export interface MutateComplianceAddressPolicyUseCase {
  execute(
    input: MutateComplianceAddressPolicyInput,
  ): Promise<MutateComplianceAddressPolicyResult>;
}
