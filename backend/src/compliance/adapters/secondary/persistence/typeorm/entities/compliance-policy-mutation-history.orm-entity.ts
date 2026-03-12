import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { CompliancePolicyMutationAction } from '../../../../../application/ports/inbound/mutate-compliance-address-policy.use-case';
import type { ComplianceAddressPolicy } from '../../../../../application/ports/outbound/compliance-address-policy.port';

@Entity({ name: 'compliance_policy_mutation_history' })
@Index('idx_compliance_policy_mutation_history_created_at', ['createdAt'])
@Index('idx_compliance_policy_mutation_history_policy', ['policy', 'createdAt'])
@Index(
  'idx_compliance_policy_mutation_history_idempotency_key',
  ['idempotencyKey'],
  {
    unique: true,
    where: '"idempotency_key" IS NOT NULL',
  },
)
export class CompliancePolicyMutationHistoryOrmEntity {
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
    name: 'policy',
    type: 'varchar',
    length: 16,
  })
  policy!: ComplianceAddressPolicy;

  @Column({
    name: 'action',
    type: 'varchar',
    length: 16,
  })
  action!: CompliancePolicyMutationAction;

  @Column({
    name: 'changed',
    type: 'boolean',
  })
  changed!: boolean;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Column({
    name: 'request_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  requestHash!: string | null;

  @Column({
    name: 'requested_by',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  requestedBy!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
