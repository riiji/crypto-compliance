import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import {
  SECURE_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type SecureMutateComplianceAddressPolicyUseCase,
} from '../../../application/ports/inbound/secure-mutate-compliance-address-policy.use-case';
import {
  LIST_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type ListComplianceAddressPolicyUseCase,
} from '../../../application/ports/inbound/list-compliance-address-policy.use-case';
import {
  LIST_COMPLIANCE_POLICY_MUTATION_HISTORY_USE_CASE,
  type ListCompliancePolicyMutationHistoryUseCase,
} from '../../../application/ports/inbound/list-compliance-policy-mutation-history.use-case';
import type { ComplianceAddressPolicy } from '../../../application/ports/outbound/compliance-address-policy.port';
import type { CompliancePolicyMutationAction } from '../../../application/ports/inbound/mutate-compliance-address-policy.use-case';
import {
  type CompliancePolicyEntryDto,
  type CompliancePolicyHistoryQueryDto,
  type CompliancePolicyMutationHistoryRecord,
  type CompliancePolicyMutationResponseDto,
  maskAddress,
  optionalHeader,
  requireHeader,
  requireMutationBody,
} from './compliance-policy-http.shared';

@Controller('compliance/policies')
export class CompliancePolicyController {
  private readonly logger = new Logger(CompliancePolicyController.name);

  constructor(
    @Inject(SECURE_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE)
    private readonly secureMutateComplianceAddressPolicyUseCase: SecureMutateComplianceAddressPolicyUseCase,
    @Inject(LIST_COMPLIANCE_ADDRESS_POLICY_USE_CASE)
    private readonly listComplianceAddressPolicyUseCase: ListComplianceAddressPolicyUseCase,
    @Inject(LIST_COMPLIANCE_POLICY_MUTATION_HISTORY_USE_CASE)
    private readonly listCompliancePolicyMutationHistoryUseCase: ListCompliancePolicyMutationHistoryUseCase,
  ) {}

  @Get('blacklist')
  async getBlacklist(): Promise<CompliancePolicyEntryDto[]> {
    const entries = await this.listComplianceAddressPolicyUseCase.execute({
      policy: 'blacklist',
    });
    this.logger.log(`GET blacklist returned ${entries.length} entries`);
    return entries;
  }

  @Get('whitelist')
  async getWhitelist(): Promise<CompliancePolicyEntryDto[]> {
    const entries = await this.listComplianceAddressPolicyUseCase.execute({
      policy: 'whitelist',
    });
    this.logger.log(`GET whitelist returned ${entries.length} entries`);
    return entries;
  }

  @Get('history')
  async getHistory(
    @Query() query: CompliancePolicyHistoryQueryDto,
  ): Promise<CompliancePolicyMutationHistoryRecord[]> {
    const parsedLimit =
      query.limit === undefined ? undefined : Number.parseInt(query.limit, 10);
    const records =
      await this.listCompliancePolicyMutationHistoryUseCase.execute({
        limit: parsedLimit,
      });
    this.logger.log(
      `GET history limit=${parsedLimit ?? 'default'} returned ${records.length} records`,
    );
    return records;
  }

  @Post('blacklist')
  async addToBlacklist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeSecurePolicyMutation(body, headers, 'blacklist', 'add');
  }

  @Delete('blacklist')
  async removeFromBlacklist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeSecurePolicyMutation(
      body,
      headers,
      'blacklist',
      'remove',
    );
  }

  @Post('whitelist')
  async addToWhitelist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeSecurePolicyMutation(body, headers, 'whitelist', 'add');
  }

  @Delete('whitelist')
  async removeFromWhitelist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeSecurePolicyMutation(
      body,
      headers,
      'whitelist',
      'remove',
    );
  }

  private async executeSecurePolicyMutation(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
    policy: ComplianceAddressPolicy,
    action: CompliancePolicyMutationAction,
  ): Promise<CompliancePolicyMutationResponseDto> {
    const validatedBody = requireMutationBody(body);
    const idempotencyKey = optionalHeader(headers, 'x-idempotency-key');
    const timestamp = requireHeader(headers, 'x-timestamp');
    const signature = requireHeader(headers, 'x-signature');
    const requestedBy = optionalHeader(headers, 'x-user-id');

    this.logger.log(
      `${action.toUpperCase()} ${policy} address=${maskAddress(validatedBody.address)} network=${validatedBody.network}`,
    );

    const result =
      await this.secureMutateComplianceAddressPolicyUseCase.execute({
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
