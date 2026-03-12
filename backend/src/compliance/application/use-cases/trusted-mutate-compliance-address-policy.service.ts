import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  COMPLIANCE_IDEMPOTENCY_PORT,
  type ComplianceIdempotencyPort,
} from '../ports/outbound/compliance-idempotency.port';
import {
  COMPLIANCE_POLICY_MUTATION_HISTORY_PORT,
  type CompliancePolicyMutationHistoryPort,
} from '../ports/outbound/compliance-policy-mutation-history.port';
import {
  MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type MutateComplianceAddressPolicyUseCase,
} from '../ports/inbound/mutate-compliance-address-policy.use-case';
import {
  TRUSTED_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type TrustedMutateComplianceAddressPolicyInput,
  type TrustedMutateComplianceAddressPolicyResult,
  type TrustedMutateComplianceAddressPolicyUseCase,
} from '../ports/inbound/trusted-mutate-compliance-address-policy.use-case';

const trustedPolicyMutationInputSchema = z.object({
  address: z.string().trim().min(1, 'Address must not be empty'),
  network: z.string().trim().min(1, 'Network must not be empty'),
  policy: z.enum(['blacklist', 'whitelist']),
  action: z.enum(['add', 'remove']),
  confirmPolicySwitch: z.boolean().optional(),
  idempotencyKey: z
    .string()
    .trim()
    .max(128, 'Idempotency key is too long')
    .optional()
    .nullable(),
  requestedBy: z
    .string()
    .trim()
    .min(1, 'Requested by must not be empty')
    .max(64, 'Requested by is too long')
    .optional()
    .nullable(),
});

@Injectable()
export class TrustedMutateComplianceAddressPolicyService implements TrustedMutateComplianceAddressPolicyUseCase {
  constructor(
    @Inject(MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE)
    private readonly mutateComplianceAddressPolicyUseCase: MutateComplianceAddressPolicyUseCase,
    @Inject(COMPLIANCE_IDEMPOTENCY_PORT)
    private readonly complianceIdempotency: ComplianceIdempotencyPort,
    @Inject(COMPLIANCE_POLICY_MUTATION_HISTORY_PORT)
    private readonly compliancePolicyMutationHistory: CompliancePolicyMutationHistoryPort,
  ) {}

  async execute(
    input: TrustedMutateComplianceAddressPolicyInput,
  ): Promise<TrustedMutateComplianceAddressPolicyResult> {
    const validated = this.validateAndNormalizeInput(input);
    const requestHash = this.createRequestHash(validated);
    const runMutation = async () => {
      const mutation = await this.mutateComplianceAddressPolicyUseCase.execute({
        address: validated.address,
        network: validated.network,
        policy: validated.policy,
        action: validated.action,
        confirmPolicySwitch: validated.confirmPolicySwitch,
      });

      await this.compliancePolicyMutationHistory.append({
        ...mutation,
        idempotencyKey: validated.idempotencyKey ?? '',
        requestHash: validated.idempotencyKey ? requestHash : null,
        requestedBy: validated.requestedBy ?? null,
        createdAt: new Date(),
      });

      return mutation;
    };

    const execution = validated.idempotencyKey
      ? await this.complianceIdempotency.executeOnce({
          key: validated.idempotencyKey,
          requestHash,
          action: runMutation,
        })
      : {
          result: await runMutation(),
          replayed: false,
        };

    return {
      ...execution.result,
      idempotencyKey: validated.idempotencyKey ?? '',
      replayed: execution.replayed,
    };
  }

  private validateAndNormalizeInput(
    input: TrustedMutateComplianceAddressPolicyInput,
  ): TrustedMutateComplianceAddressPolicyInput {
    const parsed = trustedPolicyMutationInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(this.toZodIssueMessage(parsed.error));
    }

    const normalizedAddress = parsed.data.address.trim();
    const normalizedNetwork = parsed.data.network.trim();
    const [namespace] = normalizedNetwork.split(':', 2);

    return {
      ...parsed.data,
      address:
        namespace === 'eip155'
          ? normalizedAddress.toLowerCase()
          : normalizedAddress,
      network: normalizedNetwork,
      idempotencyKey: parsed.data.idempotencyKey?.trim() ?? null,
      requestedBy: parsed.data.requestedBy?.trim() ?? null,
      confirmPolicySwitch: parsed.data.confirmPolicySwitch ?? false,
    };
  }

  private createRequestHash(
    input: TrustedMutateComplianceAddressPolicyInput,
  ): string {
    const payload = [
      input.action,
      input.policy,
      input.network,
      input.address,
      input.confirmPolicySwitch ? '1' : '0',
    ].join('\n');

    return createHash('sha256').update(payload).digest('hex');
  }

  private toZodIssueMessage(error: z.ZodError): string {
    const firstIssue = error.issues[0];
    return firstIssue
      ? firstIssue.message
      : 'Invalid trusted policy mutation request';
  }
}

export const TrustedMutateComplianceAddressPolicyProvider = {
  provide: TRUSTED_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  useExisting: TrustedMutateComplianceAddressPolicyService,
};
