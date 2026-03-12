import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  COMPLIANCE_ADDRESS_POLICY_PORT,
  type ComplianceAddressPolicy,
  type ComplianceAddressPolicyEntry,
  type ComplianceAddressPolicyListEntry,
  type ComplianceAddressPolicyPort,
} from '../../../application/ports/outbound/compliance-address-policy.port';
import { ComplianceAddressPolicyOrmEntity } from '../persistence/typeorm/entities';

@Injectable()
export class PostgresComplianceAddressPolicyAdapter implements ComplianceAddressPolicyPort {
  constructor(
    @InjectRepository(ComplianceAddressPolicyOrmEntity)
    private readonly repository: Repository<ComplianceAddressPolicyOrmEntity>,
  ) {}

  async getPolicy(input: {
    address: string;
    network: string;
  }): Promise<ComplianceAddressPolicy | null> {
    const normalized = this.normalizeLookupInput(input);

    const inBlacklist = await this.repository.existsBy({
      address: normalized.address,
      network: normalized.network,
      policy: 'blacklist',
    });
    if (inBlacklist) {
      return 'blacklist';
    }

    const inWhitelist = await this.repository.existsBy({
      address: normalized.address,
      network: normalized.network,
      policy: 'whitelist',
    });
    return inWhitelist ? 'whitelist' : null;
  }

  async add(entry: ComplianceAddressPolicyEntry): Promise<boolean> {
    const normalized = this.normalizePolicyEntry(entry);

    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(ComplianceAddressPolicyOrmEntity)
      .values({
        address: normalized.address,
        network: normalized.network,
        policy: normalized.policy,
      })
      .orIgnore()
      .execute();

    return result.identifiers.length > 0;
  }

  async exists(entry: ComplianceAddressPolicyEntry): Promise<boolean> {
    const normalized = this.normalizePolicyEntry(entry);

    return this.repository.existsBy({
      address: normalized.address,
      network: normalized.network,
      policy: normalized.policy,
    });
  }

  async remove(entry: ComplianceAddressPolicyEntry): Promise<boolean> {
    const normalized = this.normalizePolicyEntry(entry);

    const result = await this.repository.delete({
      address: normalized.address,
      network: normalized.network,
      policy: normalized.policy,
    });

    return (result.affected ?? 0) > 0;
  }

  async list(
    policy: ComplianceAddressPolicy,
  ): Promise<ComplianceAddressPolicyListEntry[]> {
    const records = await this.repository.find({
      where: { policy },
      order: {
        network: 'ASC',
        address: 'ASC',
      },
    });

    return records.map((record) => ({
      address: record.address,
      network: record.network,
    }));
  }

  private normalizeLookupInput(input: { address: string; network: string }): {
    address: string;
    network: string;
  } {
    const address = input.address.trim();
    const network = input.network.trim();
    const [namespace] = network.split(':', 2);

    return {
      address: namespace === 'eip155' ? address.toLowerCase() : address,
      network,
    };
  }

  private normalizePolicyEntry(
    entry: ComplianceAddressPolicyEntry,
  ): ComplianceAddressPolicyEntry {
    const normalized = this.normalizeLookupInput(entry);
    return {
      ...normalized,
      policy: entry.policy,
    };
  }
}

export const PostgresComplianceAddressPolicyAdapterProvider = {
  provide: COMPLIANCE_ADDRESS_POLICY_PORT,
  useExisting: PostgresComplianceAddressPolicyAdapter,
};
