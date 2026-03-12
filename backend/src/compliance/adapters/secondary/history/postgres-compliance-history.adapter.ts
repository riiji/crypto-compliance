import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  COMPLIANCE_HISTORY_PORT,
  type ComplianceHistoryPort,
} from '../../../application/ports/outbound/compliance-history.port';
import type { ComplianceCheckResult } from '../../../domain/compliance-check-result.entity';
import { ComplianceCheckHistoryOrmEntity } from '../persistence/typeorm/entities';

@Injectable()
export class PostgresComplianceHistoryAdapter implements ComplianceHistoryPort {
  constructor(
    @InjectRepository(ComplianceCheckHistoryOrmEntity)
    private readonly repository: Repository<ComplianceCheckHistoryOrmEntity>,
  ) {}

  async append(result: ComplianceCheckResult): Promise<void> {
    await this.repository.insert({
      address: result.address,
      network: result.network,
      status: result.status,
      riskScore: result.riskScore,
      signals: result.signals,
      checkedAt: result.checkedAt,
      assessmentSource: result.assessmentSource,
      retrievalSource: result.retrievalSource,
      isHighRisk: result.isHighRisk,
      providerResponsePayload: result.providerResponsePayload,
    });
  }
}

export const PostgresComplianceHistoryAdapterProvider = {
  provide: COMPLIANCE_HISTORY_PORT,
  useExisting: PostgresComplianceHistoryAdapter,
};
