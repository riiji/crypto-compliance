import {
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
  TooManyRequestsException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ServiceError } from "@grpc/grpc-js";
import { status as GrpcStatus } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  COMPLIANCE_SERVICE_NAME,
  type CompliancePolicyMutationResponse,
  type ComplianceServiceClient,
  GrpcCompliancePolicy,
  GrpcCompliancePolicyAction,
} from "./compliance-grpc.types";
import type {
  CompliancePolicy,
  CompliancePolicyEntryDto,
  CompliancePolicyMutationAction,
  CompliancePolicyMutationHistoryRecordDto,
  CompliancePolicyMutationResponseDto,
} from "./compliance-policy-http.shared";
import { COMPLIANCE_BACKEND_GRPC_CLIENT } from "./grpc-client.options";

@Injectable()
export class ComplianceGatewayClient implements OnModuleInit {
  private complianceService!: ComplianceServiceClient;

  constructor(
    @Inject(COMPLIANCE_BACKEND_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.complianceService =
      this.grpcClient.getService<ComplianceServiceClient>(
        COMPLIANCE_SERVICE_NAME,
      );
  }

  async listPolicies(
    policy: CompliancePolicy,
  ): Promise<CompliancePolicyEntryDto[]> {
    try {
      const response = await firstValueFrom(
        this.complianceService.listCompliancePolicies({
          policy: this.toGrpcPolicy(policy),
        }),
      );

      return response.entries.map((entry) => ({
        address: entry.address,
        network: entry.network,
      }));
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async listPolicyMutationHistory(
    limit?: number,
  ): Promise<CompliancePolicyMutationHistoryRecordDto[]> {
    try {
      const response = await firstValueFrom(
        this.complianceService.listCompliancePolicyMutationHistory({
          limit,
        }),
      );

      return response.records.map((record) => ({
        address: record.address,
        network: record.network,
        policy: this.fromGrpcPolicy(record.policy),
        action: this.fromGrpcAction(record.action),
        changed: record.changed,
        idempotencyKey: record.idempotencyKey,
        createdAt: record.createdAt,
      }));
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async secureMutatePolicy(input: {
    address: string;
    network: string;
    policy: CompliancePolicy;
    action: CompliancePolicyMutationAction;
    confirmPolicySwitch: boolean;
    idempotencyKey: string | null;
    timestamp: string;
    signature: string;
    requestedBy: string | null;
  }): Promise<CompliancePolicyMutationResponseDto> {
    try {
      const response = await firstValueFrom(
        this.complianceService.secureMutateCompliancePolicy({
          address: input.address,
          network: input.network,
          policy: this.toGrpcPolicy(input.policy),
          action: this.toGrpcAction(input.action),
          confirmPolicySwitch: input.confirmPolicySwitch,
          idempotencyKey: input.idempotencyKey ?? undefined,
          timestamp: input.timestamp,
          signature: input.signature,
          requestedBy: input.requestedBy ?? undefined,
        }),
      );

      return this.fromGrpcMutationResponse(response);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async trustedMutatePolicy(input: {
    address: string;
    network: string;
    policy: CompliancePolicy;
    action: CompliancePolicyMutationAction;
    confirmPolicySwitch: boolean;
    idempotencyKey: string | null;
    requestedBy: string | null;
  }): Promise<CompliancePolicyMutationResponseDto> {
    try {
      const response = await firstValueFrom(
        this.complianceService.trustedMutateCompliancePolicy({
          address: input.address,
          network: input.network,
          policy: this.toGrpcPolicy(input.policy),
          action: this.toGrpcAction(input.action),
          confirmPolicySwitch: input.confirmPolicySwitch,
          idempotencyKey: input.idempotencyKey ?? undefined,
          requestedBy: input.requestedBy ?? undefined,
        }),
      );

      return this.fromGrpcMutationResponse(response);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private fromGrpcMutationResponse(
    response: CompliancePolicyMutationResponse,
  ): CompliancePolicyMutationResponseDto {
    return {
      address: response.address,
      network: response.network,
      policy: this.fromGrpcPolicy(response.policy),
      action: this.fromGrpcAction(response.action),
      changed: response.changed,
      idempotencyKey: response.idempotencyKey,
      replayed: response.replayed,
    };
  }

  private toGrpcPolicy(policy: CompliancePolicy): GrpcCompliancePolicy {
    switch (policy) {
      case "blacklist":
        return GrpcCompliancePolicy.COMPLIANCE_POLICY_BLACKLIST;
      case "whitelist":
        return GrpcCompliancePolicy.COMPLIANCE_POLICY_WHITELIST;
    }
  }

  private fromGrpcPolicy(policy: GrpcCompliancePolicy): CompliancePolicy {
    switch (policy) {
      case GrpcCompliancePolicy.COMPLIANCE_POLICY_BLACKLIST:
        return "blacklist";
      case GrpcCompliancePolicy.COMPLIANCE_POLICY_WHITELIST:
        return "whitelist";
      default:
        throw new BadRequestException("Unsupported compliance policy");
    }
  }

  private toGrpcAction(
    action: CompliancePolicyMutationAction,
  ): GrpcCompliancePolicyAction {
    switch (action) {
      case "add":
        return GrpcCompliancePolicyAction.COMPLIANCE_POLICY_ACTION_ADD;
      case "remove":
        return GrpcCompliancePolicyAction.COMPLIANCE_POLICY_ACTION_REMOVE;
    }
  }

  private fromGrpcAction(
    action: GrpcCompliancePolicyAction,
  ): CompliancePolicyMutationAction {
    switch (action) {
      case GrpcCompliancePolicyAction.COMPLIANCE_POLICY_ACTION_ADD:
        return "add";
      case GrpcCompliancePolicyAction.COMPLIANCE_POLICY_ACTION_REMOVE:
        return "remove";
      default:
        throw new BadRequestException("Unsupported compliance policy action");
    }
  }

  private toHttpException(error: unknown): Error {
    const grpcError = error as Partial<ServiceError> | undefined;
    const message =
      grpcError && typeof grpcError.message === "string"
        ? grpcError.message
        : error instanceof Error
          ? error.message
          : "Gateway request failed";

    switch (grpcError?.code) {
      case GrpcStatus.INVALID_ARGUMENT:
        return new BadRequestException(message);
      case GrpcStatus.UNAUTHENTICATED:
        return new UnauthorizedException(message);
      case GrpcStatus.NOT_FOUND:
        return new NotFoundException(message);
      case GrpcStatus.ALREADY_EXISTS:
      case GrpcStatus.FAILED_PRECONDITION:
        return new ConflictException(message);
      case GrpcStatus.RESOURCE_EXHAUSTED:
        return new TooManyRequestsException(message);
      case GrpcStatus.DEADLINE_EXCEEDED:
        return new GatewayTimeoutException(message);
      case GrpcStatus.UNAVAILABLE:
        return new ServiceUnavailableException(message);
      default:
        return new InternalServerErrorException(message);
    }
  }
}
