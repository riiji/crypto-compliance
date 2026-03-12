export const COMPLIANCE_ADDRESS_POLICY_PORT = Symbol(
  'COMPLIANCE_ADDRESS_POLICY_PORT',
);

export type ComplianceAddressPolicy = 'whitelist' | 'blacklist';

export interface ComplianceAddressPolicyEntry {
  address: string;
  network: string;
  policy: ComplianceAddressPolicy;
}

export interface ComplianceAddressPolicyListEntry {
  address: string;
  network: string;
}

export interface ComplianceAddressPolicyPort {
  getPolicy(input: {
    address: string;
    network: string;
  }): Promise<ComplianceAddressPolicy | null>;

  add(entry: ComplianceAddressPolicyEntry): Promise<boolean>;

  remove(entry: ComplianceAddressPolicyEntry): Promise<boolean>;

  list(
    policy: ComplianceAddressPolicy,
  ): Promise<ComplianceAddressPolicyListEntry[]>;
}
