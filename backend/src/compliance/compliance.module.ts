import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CHECK_ADDRESS_COMPLIANCE_USE_CASE } from './application/ports/inbound/check-address-compliance.use-case';
import {
  CheckAddressComplianceProvider,
  CheckAddressComplianceService,
} from './application/use-cases/check-address-compliance.service';
import {
  ListComplianceAddressPolicyProvider,
  ListComplianceAddressPolicyService,
} from './application/use-cases/list-compliance-address-policy.service';
import {
  ListCompliancePolicyMutationHistoryProvider,
  ListCompliancePolicyMutationHistoryService,
} from './application/use-cases/list-compliance-policy-mutation-history.service';
import {
  MutateComplianceAddressPolicyProvider,
  MutateComplianceAddressPolicyService,
} from './application/use-cases/mutate-compliance-address-policy.service';
import {
  SecureMutateComplianceAddressPolicyProvider,
  SecureMutateComplianceAddressPolicyService,
} from './application/use-cases/secure-mutate-compliance-address-policy.service';
import {
  PostgresComplianceHistoryAdapter,
  PostgresComplianceHistoryAdapterProvider,
} from './adapters/secondary/history/postgres-compliance-history.adapter';
import {
  PostgresCompliancePolicyMutationHistoryAdapter,
  PostgresCompliancePolicyMutationHistoryAdapterProvider,
} from './adapters/secondary/history/postgres-compliance-policy-mutation-history.adapter';
import {
  PostgresComplianceAddressPolicyAdapter,
  PostgresComplianceAddressPolicyAdapterProvider,
} from './adapters/secondary/policy/postgres-compliance-address-policy.adapter';
import {
  ValkeyComplianceIdempotencyAdapter,
  ValkeyComplianceIdempotencyAdapterProvider,
} from './adapters/secondary/idempotency/valkey-compliance-idempotency.adapter';
import { SuwardComplianceProviderAdapter } from './adapters/secondary/http/suward-compliance-provider.adapter';
import {
  BullComplianceProviderAdapter,
  BullComplianceProviderAdapterProvider,
} from './adapters/secondary/queue/bull-compliance-provider.adapter';
import { ComplianceProviderQueueProcessor } from './adapters/secondary/queue/compliance-provider.processor';
import { COMPLIANCE_PROVIDER_QUEUE_NAME } from './adapters/secondary/queue/compliance-provider.queue';
import {
  ValkeyComplianceCacheAdapter,
  ValkeyComplianceCacheAdapterProvider,
  ValkeyComplianceLockAdapterProvider,
} from './adapters/secondary/cache/valkey-compliance-cache.adapter';
import { CompliancePolicyController } from './adapters/primary/http/compliance-policy.controller';
import { ComplianceController } from './adapters/primary/grpc/compliance.controller';
import {
  ComplianceAddressPolicyOrmEntity,
  ComplianceCheckHistoryOrmEntity,
  CompliancePolicyMutationHistoryOrmEntity,
} from './adapters/secondary/persistence/typeorm/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceAddressPolicyOrmEntity,
      ComplianceCheckHistoryOrmEntity,
      CompliancePolicyMutationHistoryOrmEntity,
    ]),
    BullModule.registerQueue({
      name: COMPLIANCE_PROVIDER_QUEUE_NAME,
    }),
  ],
  controllers: [CompliancePolicyController, ComplianceController],
  providers: [
    CheckAddressComplianceService,
    ListComplianceAddressPolicyService,
    ListCompliancePolicyMutationHistoryService,
    MutateComplianceAddressPolicyService,
    SecureMutateComplianceAddressPolicyService,
    PostgresComplianceAddressPolicyAdapter,
    PostgresComplianceHistoryAdapter,
    PostgresCompliancePolicyMutationHistoryAdapter,
    ValkeyComplianceIdempotencyAdapter,
    ValkeyComplianceCacheAdapter,
    BullComplianceProviderAdapter,
    SuwardComplianceProviderAdapter,
    ComplianceProviderQueueProcessor,
    CheckAddressComplianceProvider,
    ListComplianceAddressPolicyProvider,
    ListCompliancePolicyMutationHistoryProvider,
    MutateComplianceAddressPolicyProvider,
    SecureMutateComplianceAddressPolicyProvider,
    PostgresComplianceAddressPolicyAdapterProvider,
    PostgresComplianceHistoryAdapterProvider,
    PostgresCompliancePolicyMutationHistoryAdapterProvider,
    ValkeyComplianceIdempotencyAdapterProvider,
    ValkeyComplianceCacheAdapterProvider,
    ValkeyComplianceLockAdapterProvider,
    BullComplianceProviderAdapterProvider,
  ],
  exports: [CHECK_ADDRESS_COMPLIANCE_USE_CASE],
})
export class ComplianceModule {}
