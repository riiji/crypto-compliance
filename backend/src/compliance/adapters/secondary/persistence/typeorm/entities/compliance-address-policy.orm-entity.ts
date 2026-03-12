import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { ComplianceAddressPolicy } from '../../../../../application/ports/outbound/compliance-address-policy.port';

@Entity({ name: 'compliance_address_policies' })
@Unique('uq_compliance_address_policies_network_address_policy', [
  'network',
  'address',
  'policy',
])
@Index('idx_compliance_address_policies_lookup', ['network', 'address'])
@Index('idx_compliance_address_policies_list', ['policy', 'network', 'address'])
export class ComplianceAddressPolicyOrmEntity {
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

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;
}
