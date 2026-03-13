import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/jwt-auth.service";
import { ComplianceGatewayClient } from "./compliance-gateway.client";
import type {
  CompliancePolicy,
  CompliancePolicyEntryDto,
  CompliancePolicyHistoryQueryDto,
  CompliancePolicyMutationAction,
  CompliancePolicyMutationHistoryRecordDto,
  CompliancePolicyMutationResponseDto,
} from "./compliance-policy-http.shared";
import {
  maskAddress,
  optionalHeader,
  requireMutationBody,
} from "./compliance-policy-http.shared";

@Controller("compliance/admin/policies")
@UseGuards(JwtAuthGuard)
export class ComplianceAdminPolicyController {
  private readonly logger = new Logger(ComplianceAdminPolicyController.name);

  constructor(
    private readonly complianceGatewayClient: ComplianceGatewayClient,
  ) {}

  @Get("blacklist")
  async getBlacklist(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompliancePolicyEntryDto[]> {
    const entries =
      await this.complianceGatewayClient.listPolicies("blacklist");
    this.logger.log(
      `ADMIN GET blacklist user=${user.username} returned ${entries.length} entries`,
    );
    return entries;
  }

  @Get("whitelist")
  async getWhitelist(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompliancePolicyEntryDto[]> {
    const entries =
      await this.complianceGatewayClient.listPolicies("whitelist");
    this.logger.log(
      `ADMIN GET whitelist user=${user.username} returned ${entries.length} entries`,
    );
    return entries;
  }

  @Get("history")
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CompliancePolicyHistoryQueryDto,
  ): Promise<CompliancePolicyMutationHistoryRecordDto[]> {
    const parsedLimit =
      query.limit === undefined ? undefined : Number.parseInt(query.limit, 10);
    const records =
      await this.complianceGatewayClient.listPolicyMutationHistory(parsedLimit);
    this.logger.log(
      `ADMIN GET history user=${user.username} limit=${parsedLimit ?? "default"} returned ${records.length} records`,
    );
    return records;
  }

  @Post("blacklist")
  async addToBlacklist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeTrustedPolicyMutation(
      body,
      headers,
      user,
      "blacklist",
      "add",
    );
  }

  @Delete("blacklist")
  async removeFromBlacklist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeTrustedPolicyMutation(
      body,
      headers,
      user,
      "blacklist",
      "remove",
    );
  }

  @Post("whitelist")
  async addToWhitelist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeTrustedPolicyMutation(
      body,
      headers,
      user,
      "whitelist",
      "add",
    );
  }

  @Delete("whitelist")
  async removeFromWhitelist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeTrustedPolicyMutation(
      body,
      headers,
      user,
      "whitelist",
      "remove",
    );
  }

  private async executeTrustedPolicyMutation(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
    user: AuthenticatedUser,
    policy: CompliancePolicy,
    action: CompliancePolicyMutationAction,
  ): Promise<CompliancePolicyMutationResponseDto> {
    const validatedBody = requireMutationBody(body);
    const idempotencyKey = optionalHeader(headers, "x-idempotency-key");
    const requestedBy = user.username;

    this.logger.log(
      `ADMIN ${action.toUpperCase()} ${policy} user=${requestedBy} address=${maskAddress(validatedBody.address)} network=${validatedBody.network}`,
    );

    const result = await this.complianceGatewayClient.trustedMutatePolicy({
      address: validatedBody.address,
      network: validatedBody.network,
      policy,
      action,
      confirmPolicySwitch: validatedBody.confirmPolicySwitch,
      idempotencyKey,
      requestedBy,
    });

    this.logger.log(
      `ADMIN ${action.toUpperCase()} ${policy} user=${requestedBy} completed changed=${result.changed} replayed=${result.replayed}`,
    );
    return result;
  }
}
