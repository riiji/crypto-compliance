import {
  BadRequestException,
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
import type { CompliancePolicyMutationHistoryRecord } from '../../../application/ports/outbound/compliance-policy-mutation-history.port';

interface CompliancePolicyMutationBodyDto {
  address: string;
  network: string;
  confirmPolicySwitch: boolean;
}

interface CompliancePolicyHistoryQueryDto {
  limit?: string;
}

interface CompliancePolicyEntryDto {
  address: string;
  network: string;
}

interface CompliancePolicyMutationResponseDto {
  address: string;
  network: string;
  policy: ComplianceAddressPolicy;
  action: CompliancePolicyMutationAction;
  changed: boolean;
  idempotencyKey: string;
  replayed: boolean;
}

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
    const validatedBody = this.requireMutationBody(body);
    const idempotencyKey = this.optionalHeader(headers, 'x-idempotency-key');
    const timestamp = this.requireHeader(headers, 'x-timestamp');
    const signature = this.requireHeader(headers, 'x-signature');
    const requestedBy = this.optionalHeader(headers, 'x-user-id');

    this.logger.log(
      `${action.toUpperCase()} ${policy} address=${this.maskAddress(validatedBody.address)} network=${validatedBody.network}`,
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

  private requireHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string {
    const raw = headers[name.toLowerCase()];
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (!first || !first.trim()) {
      throw new BadRequestException(`${name} header is required`);
    }

    return first;
  }

  private optionalHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | null {
    const raw = headers[name.toLowerCase()];
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (!first || !first.trim()) {
      return null;
    }

    return first.trim();
  }

  private requireMutationBody(body: unknown): CompliancePolicyMutationBodyDto {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Request body must be a JSON object');
    }

    const record = body as Record<string, unknown>;
    const address =
      typeof record.address === 'string' ? record.address.trim() : '';
    const network =
      typeof record.network === 'string' ? record.network.trim() : '';

    if (!address) {
      throw new BadRequestException('Address must not be empty');
    }

    if (!network) {
      throw new BadRequestException('Network must not be empty');
    }

    const confirmPolicySwitch =
      record.confirmPolicySwitch === undefined
        ? false
        : typeof record.confirmPolicySwitch === 'boolean'
          ? record.confirmPolicySwitch
          : (() => {
              throw new BadRequestException(
                'confirmPolicySwitch must be a boolean when provided',
              );
            })();

    return { address, network, confirmPolicySwitch };
  }

  private maskAddress(address: string): string {
    const trimmed = address.trim();
    if (trimmed.length <= 10) {
      return trimmed;
    }

    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }
}
