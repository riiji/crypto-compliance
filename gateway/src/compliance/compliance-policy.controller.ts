import {
  Body,
  Controller,
  Delete,
  Headers,
  Logger,
  Post,
} from "@nestjs/common";
import { ComplianceGatewayClient } from "./compliance-gateway.client";
import type {
  CompliancePolicy,
  CompliancePolicyMutationAction,
  CompliancePolicyMutationResponseDto,
} from "./compliance-policy-http.shared";
import {
  maskAddress,
  optionalHeader,
  requireHeader,
  requireMutationBody,
} from "./compliance-policy-http.shared";

@Controller("compliance/policies")
export class CompliancePolicyController {
  private readonly logger = new Logger(CompliancePolicyController.name);

  constructor(
    private readonly complianceGatewayClient: ComplianceGatewayClient,
  ) {}

  @Post("blacklist")
  async addToBlacklist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeSecurePolicyMutation(body, headers, "blacklist", "add");
  }

  @Delete("blacklist")
  async removeFromBlacklist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeSecurePolicyMutation(
      body,
      headers,
      "blacklist",
      "remove",
    );
  }

  @Post("whitelist")
  async addToWhitelist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeSecurePolicyMutation(body, headers, "whitelist", "add");
  }

  @Delete("whitelist")
  async removeFromWhitelist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeSecurePolicyMutation(
      body,
      headers,
      "whitelist",
      "remove",
    );
  }

  private async executeSecurePolicyMutation(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
    policy: CompliancePolicy,
    action: CompliancePolicyMutationAction,
  ): Promise<CompliancePolicyMutationResponseDto> {
    const validatedBody = requireMutationBody(body);
    const idempotencyKey = optionalHeader(headers, "x-idempotency-key");
    const timestamp = requireHeader(headers, "x-timestamp");
    const signature = requireHeader(headers, "x-signature");
    const requestedBy = optionalHeader(headers, "x-user-id");

    this.logger.log(
      `${action.toUpperCase()} ${policy} address=${maskAddress(validatedBody.address)} network=${validatedBody.network}`,
    );

    const result = await this.complianceGatewayClient.secureMutatePolicy({
      address: validatedBody.address,
      network: validatedBody.network,
      policy,
      action,
      confirmPolicySwitch: validatedBody.confirmPolicySwitch,
      idempotencyKey,
      timestamp,
      signature,
      requestedBy,
    });

    this.logger.log(
      `${action.toUpperCase()} ${policy} completed changed=${result.changed} replayed=${result.replayed}`,
    );
    return result;
  }
}
