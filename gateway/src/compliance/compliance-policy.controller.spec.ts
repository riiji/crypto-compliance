import { BadRequestException } from "@nestjs/common";
import { ComplianceGatewayClient } from "./compliance-gateway.client";
import { CompliancePolicyController } from "./compliance-policy.controller";

describe("CompliancePolicyController", () => {
  let gatewayClient: jest.Mocked<ComplianceGatewayClient>;
  let controller: CompliancePolicyController;

  beforeEach(() => {
    gatewayClient = {
      onModuleInit: jest.fn(),
      listPolicies: jest.fn(),
      listPolicyMutationHistory: jest.fn(),
      secureMutatePolicy: jest.fn(),
      trustedMutatePolicy: jest.fn(),
    } as unknown as jest.Mocked<ComplianceGatewayClient>;
    controller = new CompliancePolicyController(gatewayClient);
  });

  it("calls gateway client for blacklist add endpoint", async () => {
    gatewayClient.secureMutatePolicy.mockResolvedValue({
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
        "x-timestamp": "1700000000",
        "x-signature":
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    );

    expect(gatewayClient.secureMutatePolicy).toHaveBeenCalledWith({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "blacklist",
      action: "add",
      confirmPolicySwitch: false,
      idempotencyKey: "idem-1",
      timestamp: "1700000000",
      signature:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      requestedBy: null,
    });
    expect(result.changed).toBe(true);
  });

  it("allows missing x-idempotency-key header", async () => {
    gatewayClient.secureMutatePolicy.mockResolvedValue({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "blacklist",
      action: "add",
      changed: true,
      idempotencyKey: "",
      replayed: false,
    });

    await controller.addToBlacklist(
      {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        network: "eip155:1",
      },
      {
        "x-timestamp": "1700000000",
        "x-signature":
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    );

    expect(gatewayClient.secureMutatePolicy).toHaveBeenCalledWith({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "blacklist",
      action: "add",
      confirmPolicySwitch: false,
      idempotencyKey: null,
      timestamp: "1700000000",
      signature:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      requestedBy: null,
    });
  });

  it("passes confirmPolicySwitch=true from request body", async () => {
    gatewayClient.secureMutatePolicy.mockResolvedValue({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "blacklist",
      action: "add",
      changed: true,
      idempotencyKey: "idem-confirm",
      replayed: false,
    });

    await controller.addToBlacklist(
      {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        network: "eip155:1",
        confirmPolicySwitch: true,
      },
      {
        "x-idempotency-key": "idem-confirm",
        "x-timestamp": "1700000000",
        "x-signature":
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    );

    expect(gatewayClient.secureMutatePolicy).toHaveBeenCalledWith({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      network: "eip155:1",
      policy: "blacklist",
      action: "add",
      confirmPolicySwitch: true,
      idempotencyKey: "idem-confirm",
      timestamp: "1700000000",
      signature:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      requestedBy: null,
    });
  });

  it("throws bad request when required headers are missing", async () => {
    await expect(
      controller.removeFromWhitelist(
        {
          address: "0x1234567890abcdef1234567890abcdef12345678",
          network: "eip155:1",
        },
        {
          "x-idempotency-key": "idem-2",
          "x-signature":
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws bad request for non-object request body", async () => {
    await expect(
      controller.addToBlacklist(null, {
        "x-idempotency-key": "idem-1",
        "x-timestamp": "1700000000",
        "x-signature":
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    ).rejects.toThrow("Request body must be a JSON object");
  });
});
