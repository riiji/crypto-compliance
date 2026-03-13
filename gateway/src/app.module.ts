import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ClientsModule } from "@nestjs/microservices";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { HealthController } from "./health.controller";
import { ComplianceAdminPolicyController } from "./compliance/compliance-admin-policy.controller";
import { ComplianceGatewayClient } from "./compliance/compliance-gateway.client";
import { CompliancePolicyController } from "./compliance/compliance-policy.controller";
import { createComplianceBackendGrpcClientOptions } from "./compliance/grpc-client.options";

@Module({
  imports: [
    SentryModule.forRoot(),
    ClientsModule.register([createComplianceBackendGrpcClientOptions()]),
  ],
  controllers: [
    HealthController,
    CompliancePolicyController,
    ComplianceAdminPolicyController,
  ],
  providers: [
    ComplianceGatewayClient,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
