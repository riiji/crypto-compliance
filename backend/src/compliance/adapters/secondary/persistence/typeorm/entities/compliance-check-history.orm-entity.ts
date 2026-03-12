import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  ComplianceAssessmentSource,
  ComplianceCheckStatus,
  ComplianceRetrievalSource,
  ComplianceSignal,
} from '../../../../../domain/compliance-check-result.entity';

@Entity({ name: 'compliance_check_history' })
@Index('idx_compliance_check_history_lookup', [
  'network',
  'address',
  'createdAt',
])
export class ComplianceCheckHistoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'address',
    type: 'varchar',
    length: 191,
  })
  address!: string;

  @Column({
    name: 'network',
    type: 'varchar',
    length: 64,
  })
  network!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 16,
  })
  status!: ComplianceCheckStatus;

  @Column({
    name: 'risk_score',
    type: 'double precision',
    nullable: true,
  })
  riskScore!: number | null;

  @Column({
    name: 'signals',
    type: 'jsonb',
    nullable: true,
  })
  signals!: ComplianceSignal[] | null;

  @Column({
    name: 'checked_at',
    type: 'timestamptz',
    nullable: true,
  })
  checkedAt!: Date | null;

  @Column({
    name: 'assessment_source',
    type: 'varchar',
    length: 16,
  })
  assessmentSource!: ComplianceAssessmentSource;

  @Column({
    name: 'retrieval_source',
    type: 'varchar',
    length: 16,
  })
  retrievalSource!: ComplianceRetrievalSource;

  @Column({
    name: 'is_high_risk',
    type: 'boolean',
    default: false,
  })
  isHighRisk!: boolean;

  @Column({
    name: 'provider_response_payload',
    type: 'jsonb',
    nullable: true,
  })
  providerResponsePayload!: object | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
