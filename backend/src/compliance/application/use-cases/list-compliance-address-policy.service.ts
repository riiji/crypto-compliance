import { Inject, Injectable } from '@nestjs/common';
import {
  LIST_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type ListComplianceAddressPolicyUseCase,
} from '../ports/inbound/list-compliance-address-policy.use-case';
import {
  COMPLIANCE_ADDRESS_POLICY_PORT,
  type ComplianceAddressPolicyPort,
} from '../ports/outbound/compliance-address-policy.port';

@Injectable()
export class ListComplianceAddressPolicyService implements ListComplianceAddressPolicyUseCase {
  constructor(
    @Inject(COMPLIANCE_ADDRESS_POLICY_PORT)
    private readonly complianceAddressPolicy: ComplianceAddressPolicyPort,
  ) {}

  async execute(input: {
    policy: 'whitelist' | 'blacklist';
  }): Promise<{ address: string; network: string }[]> {
    return this.complianceAddressPolicy.list(input.policy);
  }
}

export const ListComplianceAddressPolicyProvider = {
  provide: LIST_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  useExisting: ListComplianceAddressPolicyService,
};
