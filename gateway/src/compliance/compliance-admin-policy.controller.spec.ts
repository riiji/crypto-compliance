import { BadRequestException } from "@nestjs/common";
import { ComplianceGatewayClient } from "./compliance-gateway.client";
import { ComplianceAdminPolicyController } from "./compliance-admin-policy.controller";

describe("ComplianceAdminPolicyController", () => {
  let gatewayClient: jest.Mocked<ComplianceGatewayClient>;
  let controller: ComplianceAdminPolicyController;

  beforeEach(() => {
    gatewayClient = {
      onModuleInit: jest.fn(),
      listPolicies: jest.fn(),
      listPolicyMutationHistory: jest.fn(),
      secureMutatePolicy: jest.fn(),
      trustedMutatePolicy: jest.fn(),
    } as unknown as jest.Mocked<ComplianceGatewayClient>;
    controller = new ComplianceAdminPolicyController(gatewayClient);
  });

  it("calls gateway client for blacklist add endpoint without HMAC headers", async () => {
    gatewayClient.trustedMutatePolicy.mockResolvedValue({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "blacklist",
      action: "add",
      changed: true,
      idempotencyKey: "idem-1",
      replayed: false,
    });

    const result = await controller.addToBlacklist(
      {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        network: "eip155:1",
      },
      {
        "x-idempotency-key": "idem-1",
        "x-user-id": "alice",
      },
    );

    expect(gatewayClient.trustedMutatePolicy).toHaveBeenCalledWith({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "blacklist",
      action: "add",
      confirmPolicySwitch: false,
      idempotencyKey: "idem-1",
      requestedBy: "alice",
    });
    expect(result.changed).toBe(true);
  });

  it("allows missing x-idempotency-key header on admin endpoints", async () => {
    gatewayClient.trustedMutatePolicy.mockResolvedValue({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "whitelist",
      action: "remove",
      changed: true,
      idempotencyKey: "",
      replayed: false,
    });

    await controller.removeFromWhitelist(
      {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        network: "eip155:1",
      },
      {},
    );

    expect(gatewayClient.trustedMutatePolicy).toHaveBeenCalledWith({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "whitelist",
      action: "remove",
      confirmPolicySwitch: false,
      idempotencyKey: null,
      requestedBy: null,
    });
  });

  it("throws bad request for non-object request body", async () => {
    await expect(controller.addToBlacklist(null, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
