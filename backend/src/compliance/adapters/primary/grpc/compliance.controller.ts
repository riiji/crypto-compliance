import {
  BadRequestException,
  Controller,
  Inject,
  Logger,
} from '@nestjs/common';
import {
  CHECK_ADDRESS_COMPLIANCE_USE_CASE,
  type CheckAddressComplianceUseCase,
} from '../../../application/ports/inbound/check-address-compliance.use-case';
import {
  LIST_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type ListComplianceAddressPolicyUseCase,
} from '../../../application/ports/inbound/list-compliance-address-policy.use-case';
import {
  LIST_COMPLIANCE_POLICY_MUTATION_HISTORY_USE_CASE,
  type ListCompliancePolicyMutationHistoryUseCase,
} from '../../../application/ports/inbound/list-compliance-policy-mutation-history.use-case';
import type { CompliancePolicyMutationAction as DomainCompliancePolicyMutationAction } from '../../../application/ports/inbound/mutate-compliance-address-policy.use-case';
import {
  SECURE_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type SecureMutateComplianceAddressPolicyUseCase,
} from '../../../application/ports/inbound/secure-mutate-compliance-address-policy.use-case';
import {
  TRUSTED_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type TrustedMutateComplianceAddressPolicyUseCase,
} from '../../../application/ports/inbound/trusted-mutate-compliance-address-policy.use-case';
import type { ComplianceAddressPolicy as DomainComplianceAddressPolicy } from '../../../application/ports/outbound/compliance-address-policy.port';
import type { CompliancePolicyMutationHistoryRecord as DomainCompliancePolicyMutationHistoryRecord } from '../../../application/ports/outbound/compliance-policy-mutation-history.port';
import type {
  ComplianceAssessmentSource as DomainComplianceAssessmentSource,
  ComplianceCheckStatus as DomainComplianceCheckStatus,
  ComplianceRetrievalSource as DomainComplianceRetrievalSource,
  ComplianceSignal as DomainComplianceSignal,
} from '../../../domain/compliance-check-result.entity';
import {
  ComplianceAssessmentSource,
  ComplianceCheckStatus,
  CompliancePolicy,
  CompliancePolicyAction,
  ComplianceRetrievalSource,
  type CheckAddressComplianceRequest,
  type CheckAddressComplianceResponse,
  type CompliancePolicyMutationResponse,
  type ListCompliancePoliciesRequest,
  type ListCompliancePoliciesResponse,
  type ListCompliancePolicyMutationHistoryRequest,
  type ListCompliancePolicyMutationHistoryResponse,
  type ComplianceServiceController,
  ComplianceServiceControllerMethods,
  type SecureMutateCompliancePolicyRequest,
  type TrustedMutateCompliancePolicyRequest,
} from '../../../compliance';
import { toGrpcException } from './grpc-error.util';

@Controller()
@ComplianceServiceControllerMethods()
export class ComplianceController implements ComplianceServiceController {
  private readonly logger = new Logger(ComplianceController.name);

  constructor(
    @Inject(CHECK_ADDRESS_COMPLIANCE_USE_CASE)
    private readonly checkAddressComplianceUseCase: CheckAddressComplianceUseCase,
    @Inject(LIST_COMPLIANCE_ADDRESS_POLICY_USE_CASE)
    private readonly listComplianceAddressPolicyUseCase: ListComplianceAddressPolicyUseCase,
    @Inject(LIST_COMPLIANCE_POLICY_MUTATION_HISTORY_USE_CASE)
    private readonly listCompliancePolicyMutationHistoryUseCase: ListCompliancePolicyMutationHistoryUseCase,
    @Inject(SECURE_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE)
    private readonly secureMutateComplianceAddressPolicyUseCase: SecureMutateComplianceAddressPolicyUseCase,
    @Inject(TRUSTED_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE)
    private readonly trustedMutateComplianceAddressPolicyUseCase: TrustedMutateComplianceAddressPolicyUseCase,
  ) {}

  async checkAddressCompliance(
    request: CheckAddressComplianceRequest,
  ): Promise<CheckAddressComplianceResponse> {
    const maskedAddress = this.maskAddress(request.address);
    this.logger.log(
      `gRPC CheckAddressCompliance requested address=${maskedAddress} network=${request.network}`,
    );

    try {
      const result = await this.checkAddressComplianceUseCase.execute({
        address: request.address,
        network: request.network,
      });

      const response: CheckAddressComplianceResponse = {
        address: result.address,
        network: result.network,
        status: this.mapStatus(result.status),
        riskScore: result.riskScore ?? undefined,
        signals: this.mapSignals(result.signals),
        checkedAt: result.checkedAt?.toISOString(),
        assessmentSource: this.mapAssessmentSource(result.assessmentSource),
        retrievalSource: this.mapRetrievalSource(result.retrievalSource),
        isHighRisk: result.isHighRisk,
      };

      this.logger.log(
        `gRPC CheckAddressCompliance completed address=${maskedAddress} status=${result.status} retrievalSource=${result.retrievalSource} isHighRisk=${result.isHighRisk}`,
      );

      return response;
    } catch (error) {
      this.logger.warn(
        `gRPC CheckAddressCompliance failed address=${maskedAddress} network=${request.network} error=${this.toErrorMessage(error)}`,
      );
      throw toGrpcException(error);
    }
  }

  async listCompliancePolicies(
    request: ListCompliancePoliciesRequest,
  ): Promise<ListCompliancePoliciesResponse> {
    this.logger.log(
      `gRPC ListCompliancePolicies requested policy=${request.policy}`,
    );

    try {
      const entries = await this.listComplianceAddressPolicyUseCase.execute({
        policy: this.fromGrpcPolicy(request.policy),
      });

      return {
        entries: entries.map((entry) => ({
          address: entry.address,
          network: entry.network,
        })),
      };
    } catch (error) {
      this.logger.warn(
        `gRPC ListCompliancePolicies failed policy=${request.policy} error=${this.toErrorMessage(error)}`,
      );
      throw toGrpcException(error);
    }
  }

  async listCompliancePolicyMutationHistory(
    request: ListCompliancePolicyMutationHistoryRequest,
  ): Promise<ListCompliancePolicyMutationHistoryResponse> {
    this.logger.log(
      `gRPC ListCompliancePolicyMutationHistory requested limit=${request.limit ?? 'default'}`,
    );

    try {
      const records =
        await this.listCompliancePolicyMutationHistoryUseCase.execute({
          limit: request.limit,
        });

      return {
        records: records.map((record) =>
          this.toGrpcPolicyMutationHistoryRecord(record),
        ),
      };
    } catch (error) {
      this.logger.warn(
        `gRPC ListCompliancePolicyMutationHistory failed limit=${request.limit ?? 'default'} error=${this.toErrorMessage(error)}`,
      );
      throw toGrpcException(error);
    }
  }

  async secureMutateCompliancePolicy(
    request: SecureMutateCompliancePolicyRequest,
  ): Promise<CompliancePolicyMutationResponse> {
    const maskedAddress = this.maskAddress(request.address);
    this.logger.log(
      `gRPC SecureMutateCompliancePolicy requested action=${request.action} policy=${request.policy} address=${maskedAddress} network=${request.network}`,
    );

    try {
      const result =
        await this.secureMutateComplianceAddressPolicyUseCase.execute({
          address: request.address,
          network: request.network,
          policy: this.fromGrpcPolicy(request.policy),
          action: this.fromGrpcAction(request.action),
          confirmPolicySwitch: request.confirmPolicySwitch,
          idempotencyKey: request.idempotencyKey ?? null,
          timestamp: request.timestamp,
          signature: request.signature,
          requestedBy: request.requestedBy ?? null,
        });

      return this.toGrpcPolicyMutationResponse(result);
    } catch (error) {
      this.logger.warn(
        `gRPC SecureMutateCompliancePolicy failed action=${request.action} policy=${request.policy} address=${maskedAddress} network=${request.network} error=${this.toErrorMessage(error)}`,
      );
      throw toGrpcException(error);
    }
  }

  async trustedMutateCompliancePolicy(
    request: TrustedMutateCompliancePolicyRequest,
  ): Promise<CompliancePolicyMutationResponse> {
    const maskedAddress = this.maskAddress(request.address);
    this.logger.log(
      `gRPC TrustedMutateCompliancePolicy requested action=${request.action} policy=${request.policy} address=${maskedAddress} network=${request.network}`,
    );

    try {
      const result =
        await this.trustedMutateComplianceAddressPolicyUseCase.execute({
          address: request.address,
          network: request.network,
          policy: this.fromGrpcPolicy(request.policy),
          action: this.fromGrpcAction(request.action),
          confirmPolicySwitch: request.confirmPolicySwitch,
          idempotencyKey: request.idempotencyKey ?? null,
          requestedBy: request.requestedBy ?? null,
        });

      return this.toGrpcPolicyMutationResponse(result);
    } catch (error) {
      this.logger.warn(
        `gRPC TrustedMutateCompliancePolicy failed action=${request.action} policy=${request.policy} address=${maskedAddress} network=${request.network} error=${this.toErrorMessage(error)}`,
      );
      throw toGrpcException(error);
    }
  }

  private mapStatus(
    status: DomainComplianceCheckStatus,
  ): ComplianceCheckStatus {
    switch (status) {
      case 'ready':
        return ComplianceCheckStatus.COMPLIANCE_CHECK_STATUS_READY;
      case 'in_progress':
        return ComplianceCheckStatus.COMPLIANCE_CHECK_STATUS_IN_PROGRESS;
    }
  }

  private mapAssessmentSource(
    source: DomainComplianceAssessmentSource,
  ): ComplianceAssessmentSource {
    switch (source) {
      case 'provider':
        return ComplianceAssessmentSource.COMPLIANCE_ASSESSMENT_SOURCE_PROVIDER;
      case 'blacklist':
        return ComplianceAssessmentSource.COMPLIANCE_ASSESSMENT_SOURCE_BLACKLIST;
      case 'whitelist':
        return ComplianceAssessmentSource.COMPLIANCE_ASSESSMENT_SOURCE_WHITELIST;
    }
  }

  private mapRetrievalSource(
    source: DomainComplianceRetrievalSource,
  ): ComplianceRetrievalSource {
    switch (source) {
      case 'provider':
        return ComplianceRetrievalSource.COMPLIANCE_RETRIEVAL_SOURCE_PROVIDER;
      case 'cache':
        return ComplianceRetrievalSource.COMPLIANCE_RETRIEVAL_SOURCE_CACHE;
      case 'policy':
        return ComplianceRetrievalSource.COMPLIANCE_RETRIEVAL_SOURCE_POLICY;
    }
  }

  private mapSignals(
    signals: DomainComplianceSignal[] | null,
  ): CheckAddressComplianceResponse['signals'] {
    if (!signals) {
      return [];
    }

    return signals.map((signal) => ({
      category: signal.category,
      score: signal.score,
    }));
  }

  private toGrpcPolicyMutationHistoryRecord(
    record: DomainCompliancePolicyMutationHistoryRecord,
  ): ListCompliancePolicyMutationHistoryResponse['records'][number] {
    return {
      address: record.address,
      network: record.network,
      policy: this.toGrpcPolicy(record.policy),
      action: this.toGrpcAction(record.action),
      changed: record.changed,
      idempotencyKey: record.idempotencyKey,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private toGrpcPolicyMutationResponse(input: {
    address: string;
    network: string;
    policy: DomainComplianceAddressPolicy;
    action: DomainCompliancePolicyMutationAction;
    changed: boolean;
    idempotencyKey: string;
    replayed: boolean;
  }): CompliancePolicyMutationResponse {
    return {
      address: input.address,
      network: input.network,
      policy: this.toGrpcPolicy(input.policy),
      action: this.toGrpcAction(input.action),
      changed: input.changed,
      idempotencyKey: input.idempotencyKey,
      replayed: input.replayed,
    };
  }

  private toGrpcPolicy(
    policy: DomainComplianceAddressPolicy,
  ): CompliancePolicy {
    switch (policy) {
      case 'blacklist':
        return CompliancePolicy.COMPLIANCE_POLICY_BLACKLIST;
      case 'whitelist':
        return CompliancePolicy.COMPLIANCE_POLICY_WHITELIST;
    }
  }

  private fromGrpcPolicy(
    policy: CompliancePolicy,
  ): DomainComplianceAddressPolicy {
    switch (policy) {
      case CompliancePolicy.COMPLIANCE_POLICY_BLACKLIST:
        return 'blacklist';
      case CompliancePolicy.COMPLIANCE_POLICY_WHITELIST:
        return 'whitelist';
      default:
        throw new BadRequestException(
          `Unsupported compliance policy: ${policy}`,
        );
    }
  }

  private toGrpcAction(
    action: DomainCompliancePolicyMutationAction,
  ): CompliancePolicyAction {
    switch (action) {
      case 'add':
        return CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_ADD;
      case 'remove':
        return CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_REMOVE;
    }
  }

  private fromGrpcAction(
    action: CompliancePolicyAction,
  ): DomainCompliancePolicyMutationAction {
    switch (action) {
      case CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_ADD:
        return 'add';
      case CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_REMOVE:
        return 'remove';
      default:
        throw new BadRequestException(
          `Unsupported compliance policy action: ${action}`,
        );
    }
  }

  private maskAddress(address: string): string {
    const trimmed = address.trim();
    if (trimmed.length <= 10) {
      return trimmed;
    }

    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
