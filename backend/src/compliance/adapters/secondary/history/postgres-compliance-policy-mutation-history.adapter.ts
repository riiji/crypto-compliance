import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  COMPLIANCE_POLICY_MUTATION_HISTORY_PORT,
  type CompliancePolicyMutationHistoryPort,
  type CompliancePolicyMutationHistoryRecord,
} from '../../../application/ports/outbound/compliance-policy-mutation-history.port';
import { CompliancePolicyMutationHistoryOrmEntity } from '../persistence/typeorm/entities';

@Injectable()
export class PostgresCompliancePolicyMutationHistoryAdapter implements CompliancePolicyMutationHistoryPort {
  constructor(
    @InjectRepository(CompliancePolicyMutationHistoryOrmEntity)
    private readonly repository: Repository<CompliancePolicyMutationHistoryOrmEntity>,
  ) {}

  async append(record: CompliancePolicyMutationHistoryRecord): Promise<void> {
    await this.repository.insert({
      address: record.address,
      network: record.network,
      policy: record.policy,
      action: record.action,
      changed: record.changed,
      idempotencyKey: record.idempotencyKey,
      requestedBy: record.requestedBy,
      createdAt: record.createdAt,
    });
  }

  async list(limit: number): Promise<CompliancePolicyMutationHistoryRecord[]> {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 100;
    const records = await this.repository.find({
      order: {
        createdAt: 'DESC',
      },
      take: safeLimit,
    });

    return records.map((record) => ({
      address: record.address,
      network: record.network,
      policy: record.policy,
      action: record.action,
      changed: record.changed,
      idempotencyKey: record.idempotencyKey,
      requestedBy: record.requestedBy,
      createdAt: new Date(record.createdAt),
    }));
  }
}

export const PostgresCompliancePolicyMutationHistoryAdapterProvider = {
  provide: COMPLIANCE_POLICY_MUTATION_HISTORY_PORT,
  useExisting: PostgresCompliancePolicyMutationHistoryAdapter,
};
