import type { ClientGrpc } from "@nestjs/microservices";
import { of } from "rxjs";
import { ComplianceGatewayClient } from "./compliance-gateway.client";
import {
  GrpcCompliancePolicy,
  GrpcCompliancePolicyAction,
  type ComplianceServiceClient,
} from "./compliance-grpc.types";

describe("ComplianceGatewayClient", () => {
  let grpcClient: jest.Mocked<ClientGrpc>;
  let complianceService: jest.Mocked<ComplianceServiceClient>;
  let client: ComplianceGatewayClient;

  beforeEach(() => {
    complianceService = {
      listCompliancePolicies: jest.fn(),
      listCompliancePolicyMutationHistory: jest.fn(),
      secureMutateCompliancePolicy: jest.fn(),
      trustedMutateCompliancePolicy: jest.fn(),
    } as unknown as jest.Mocked<ComplianceServiceClient>;

    grpcClient = {
      getService: jest.fn().mockReturnValue(complianceService),
    } as unknown as jest.Mocked<ClientGrpc>;

    client = new ComplianceGatewayClient(grpcClient);
    client.onModuleInit();
  });

  it("returns an empty array when grpc omits empty policy entries", async () => {
    complianceService.listCompliancePolicies.mockReturnValue(
      of({} as any),
    );

    await expect(client.listPolicies("blacklist")).resolves.toEqual([]);
  });

  it("maps grpc policy entries to http dto shape", async () => {
    complianceService.listCompliancePolicies.mockReturnValue(
      of({
        entries: [
          {
            address: "0xabc",
            network: "eip155:1",
          },
        ],
      }),
    );

    await expect(client.listPolicies("blacklist")).resolves.toEqual([
      {
        address: "0xabc",
        network: "eip155:1",
      },
    ]);
  });

  it("returns an empty array when grpc omits empty history records", async () => {
    complianceService.listCompliancePolicyMutationHistory.mockReturnValue(
      of({} as any),
    );

    await expect(client.listPolicyMutationHistory()).resolves.toEqual([]);
  });

  it("maps grpc history records to http dto shape", async () => {
    complianceService.listCompliancePolicyMutationHistory.mockReturnValue(
      of({
        records: [
          {
            address: "0xabc",
            network: "eip155:1",
            policy: GrpcCompliancePolicy.COMPLIANCE_POLICY_BLACKLIST,
            action: GrpcCompliancePolicyAction.COMPLIANCE_POLICY_ACTION_ADD,
            changed: true,
            idempotencyKey: "idem-1",
            createdAt: "2026-01-02T03:04:05.000Z",
          },
        ],
      }),
    );

    await expect(client.listPolicyMutationHistory(100)).resolves.toEqual([
      {
        address: "0xabc",
        network: "eip155:1",
        policy: "blacklist",
        action: "add",
        changed: true,
        idempotencyKey: "idem-1",
        createdAt: "2026-01-02T03:04:05.000Z",
      },
    ]);
  });
});
