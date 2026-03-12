import type {
  ComplianceAddressPolicy,
  ComplianceAddressPolicyListEntry,
} from '../outbound/compliance-address-policy.port';

export const LIST_COMPLIANCE_ADDRESS_POLICY_USE_CASE = Symbol(
  'LIST_COMPLIANCE_ADDRESS_POLICY_USE_CASE',
);

export interface ListComplianceAddressPolicyUseCase {
  execute(input: {
    policy: ComplianceAddressPolicy;
  }): Promise<ComplianceAddressPolicyListEntry[]>;
}
