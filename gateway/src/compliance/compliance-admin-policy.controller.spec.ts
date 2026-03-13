import { BadRequestException } from "@nestjs/common";
import { ComplianceGatewayClient } from "./compliance-gateway.client";
import { ComplianceAdminPolicyController } from "./compliance-admin-policy.controller";
import type { AuthenticatedUser } from "../auth/jwt-auth.service";

describe("ComplianceAdminPolicyController", () => {
  let gatewayClient: jest.Mocked<ComplianceGatewayClient>;
  let controller: ComplianceAdminPolicyController;
  const user: AuthenticatedUser = {
    username: "alice",
  };

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
      },
      user,
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
      user,
    );

    expect(gatewayClient.trustedMutatePolicy).toHaveBeenCalledWith({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "whitelist",
      action: "remove",
      confirmPolicySwitch: false,
      idempotencyKey: null,
      requestedBy: "alice",
    });
  });

  it("throws bad request for non-object request body", async () => {
    await expect(
      controller.addToBlacklist(null, {}, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns blacklist entries for an authenticated user", async () => {
    gatewayClient.listPolicies.mockResolvedValue([
      {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        network: "eip155:1",
      },
    ]);

    const result = await controller.getBlacklist(user);

    expect(gatewayClient.listPolicies).toHaveBeenCalledWith("blacklist");
    expect(result).toHaveLength(1);
  });

  it("returns history with parsed limit for an authenticated user", async () => {
    gatewayClient.listPolicyMutationHistory.mockResolvedValue([]);

    await controller.getHistory(user, { limit: "200" });

    expect(gatewayClient.listPolicyMutationHistory).toHaveBeenCalledWith(200);
  });
});
