import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { z } from 'zod';
import {
  COMPLIANCE_ADDRESS_POLICY_PORT,
  type ComplianceAddressPolicyPort,
} from '../ports/outbound/compliance-address-policy.port';
import {
  MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type MutateComplianceAddressPolicyInput,
  type MutateComplianceAddressPolicyResult,
  type MutateComplianceAddressPolicyUseCase,
} from '../ports/inbound/mutate-compliance-address-policy.use-case';

const CAIP2_NETWORK_PATTERN = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/;
const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

const mutateCompliancePolicyInputSchema = z
  .object({
    address: z.string().trim().min(1, 'Address must not be empty'),
    network: z
      .string()
      .trim()
      .min(1, 'Network must not be empty')
      .regex(
        CAIP2_NETWORK_PATTERN,
        'Network must be a valid CAIP-2 chain id (example: eip155:1)',
      ),
    policy: z.enum(['blacklist', 'whitelist']),
    action: z.enum(['add', 'remove']),
    confirmPolicySwitch: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const [namespace, reference = ''] = value.network.split(':', 2);
    if (namespace !== 'eip155') {
      return;
    }

    if (!/^[1-9][0-9]*$/.test(reference)) {
      ctx.addIssue({
        code: 'custom',
        message: 'eip155 reference must be a positive chain id',
        path: ['network'],
      });
    }

    if (!EVM_ADDRESS_PATTERN.test(value.address)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Address must be a valid EVM address (0x + 40 hex chars)',
        path: ['address'],
      });
    }
  });

@Injectable()
export class MutateComplianceAddressPolicyService implements MutateComplianceAddressPolicyUseCase {
  constructor(
    @Inject(COMPLIANCE_ADDRESS_POLICY_PORT)
    private readonly complianceAddressPolicy: ComplianceAddressPolicyPort,
  ) {}

  async execute(
    input: MutateComplianceAddressPolicyInput,
  ): Promise<MutateComplianceAddressPolicyResult> {
    const normalized = this.validateAndNormalizeInput(input);

    const changed =
      normalized.action === 'add'
        ? await this.addWithInvariant(normalized)
        : await this.complianceAddressPolicy.remove({
            address: normalized.address,
            network: normalized.network,
            policy: normalized.policy,
          });

    return {
      address: normalized.address,
      network: normalized.network,
      policy: normalized.policy,
      action: normalized.action,
      changed,
    };
  }

  private async addWithInvariant(
    input: MutateComplianceAddressPolicyInput,
  ): Promise<boolean> {
    const targetEntry = {
      address: input.address,
      network: input.network,
      policy: input.policy,
    } as const;
    const oppositePolicy = input.policy === 'blacklist' ? 'whitelist' : 'blacklist';
    const oppositeEntry = {
      address: input.address,
      network: input.network,
      policy: oppositePolicy,
    } as const;

    const [targetExists, oppositeExists] = await Promise.all([
      this.complianceAddressPolicy.exists(targetEntry),
      this.complianceAddressPolicy.exists(oppositeEntry),
    ]);

    if (
      input.policy === 'blacklist' &&
      oppositeExists &&
      !input.confirmPolicySwitch
    ) {
      throw new ConflictException(
        'Address already exists in whitelist. Confirmation is required to move it to blacklist.',
      );
    }

    if (oppositeExists) {
      await this.complianceAddressPolicy.remove(oppositeEntry);
    }

    const added = targetExists
      ? false
      : await this.complianceAddressPolicy.add(targetEntry);
    return oppositeExists || added;
  }

  private validateAndNormalizeInput(
    input: MutateComplianceAddressPolicyInput,
  ): MutateComplianceAddressPolicyInput {
    const parsed = mutateCompliancePolicyInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(this.toZodIssueMessage(parsed.error));
    }

    return this.normalizeInput(parsed.data);
  }

  private normalizeInput(
    input: MutateComplianceAddressPolicyInput,
  ): MutateComplianceAddressPolicyInput {
    const [namespace] = input.network.split(':', 2);
    return {
      ...input,
      address:
        namespace === 'eip155' ? input.address.toLowerCase() : input.address,
      confirmPolicySwitch: input.confirmPolicySwitch ?? false,
    };
  }

  private toZodIssueMessage(error: z.ZodError): string {
    const firstIssue = error.issues[0];
    return firstIssue ? firstIssue.message : 'Invalid policy mutation request';
  }
}

export const MutateComplianceAddressPolicyProvider = {
  provide: MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  useExisting: MutateComplianceAddressPolicyService,
};
