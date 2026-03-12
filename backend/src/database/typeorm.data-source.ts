import { join } from 'node:path';
import { DataSource } from 'typeorm';
import {
  ComplianceAddressPolicyOrmEntity,
  ComplianceCheckHistoryOrmEntity,
  CompliancePolicyMutationHistoryOrmEntity,
} from '../compliance/adapters/secondary/persistence/typeorm/entities';
import { createTypeOrmDataSourceOptions } from './typeorm.config';

const dataSource = new DataSource({
  ...createTypeOrmDataSourceOptions(),
  entities: [
    ComplianceAddressPolicyOrmEntity,
    ComplianceCheckHistoryOrmEntity,
    CompliancePolicyMutationHistoryOrmEntity,
  ],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});

export default dataSource;
