import {
  Body,
  Controller,
  Delete,
  Headers,
  Inject,
  Logger,
  Post,
} from '@nestjs/common';
import {
  TRUSTED_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type TrustedMutateComplianceAddressPolicyUseCase,
} from '../../../application/ports/inbound/trusted-mutate-compliance-address-policy.use-case';
import type { ComplianceAddressPolicy } from '../../../application/ports/outbound/compliance-address-policy.port';
import type { CompliancePolicyMutationAction } from '../../../application/ports/inbound/mutate-compliance-address-policy.use-case';
import {
  type CompliancePolicyMutationResponseDto,
  maskAddress,
  optionalHeader,
  requireMutationBody,
} from './compliance-policy-http.shared';

@Controller('compliance/admin/policies')
export class ComplianceAdminPolicyController {
  private readonly logger = new Logger(ComplianceAdminPolicyController.name);

  constructor(
    @Inject(TRUSTED_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE)
    private readonly trustedMutateComplianceAddressPolicyUseCase: TrustedMutateComplianceAddressPolicyUseCase,
  ) {}

  @Post('blacklist')
  async addToBlacklist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeTrustedPolicyMutation(body, headers, 'blacklist', 'add');
  }

  @Delete('blacklist')
  async removeFromBlacklist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeTrustedPolicyMutation(
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
    return this.executeTrustedPolicyMutation(body, headers, 'whitelist', 'add');
  }

  @Delete('whitelist')
  async removeFromWhitelist(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<CompliancePolicyMutationResponseDto> {
    return this.executeTrustedPolicyMutation(
      body,
      headers,
      'whitelist',
      'remove',
    );
  }

  private async executeTrustedPolicyMutation(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
    policy: ComplianceAddressPolicy,
    action: CompliancePolicyMutationAction,
  ): Promise<CompliancePolicyMutationResponseDto> {
    const validatedBody = requireMutationBody(body);
    const idempotencyKey = optionalHeader(headers, 'x-idempotency-key');
    const requestedBy = optionalHeader(headers, 'x-user-id');

    this.logger.log(
      `ADMIN ${action.toUpperCase()} ${policy} address=${maskAddress(validatedBody.address)} network=${validatedBody.network}`,
    );

    const result =
      await this.trustedMutateComplianceAddressPolicyUseCase.execute({
        address: validatedBody.address,
        network: validatedBody.network,
        policy,
        action,
        confirmPolicySwitch: validatedBody.confirmPolicySwitch,
        idempotencyKey,
        requestedBy,
      });

    this.logger.log(
      `ADMIN ${action.toUpperCase()} ${policy} completed changed=${result.changed} replayed=${result.replayed}`,
    );
    return result;
  }
}
