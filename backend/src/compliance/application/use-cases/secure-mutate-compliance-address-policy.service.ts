import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
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
  SECURE_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  type SecureMutateComplianceAddressPolicyInput,
  type SecureMutateComplianceAddressPolicyResult,
  type SecureMutateComplianceAddressPolicyUseCase,
} from '../ports/inbound/secure-mutate-compliance-address-policy.use-case';

const securePolicyMutationInputSchema = z.object({
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
  timestamp: z
    .string()
    .trim()
    .regex(/^[0-9]{1,20}$/, 'Timestamp must be unix seconds'),
  signature: z
    .string()
    .trim()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'Signature must be a lowercase or uppercase hex sha256 digest',
    ),
  requestedBy: z
    .string()
    .trim()
    .min(1, 'Requested by must not be empty')
    .max(64, 'Requested by is too long')
    .optional()
    .nullable(),
});

@Injectable()
export class SecureMutateComplianceAddressPolicyService implements SecureMutateComplianceAddressPolicyUseCase {
  private readonly secret = process.env.COMPLIANCE_POLICY_HMAC_SECRET;

  private readonly allowedPastSeconds = this.parsePositiveInteger(
    process.env.COMPLIANCE_POLICY_SIGNATURE_MAX_PAST_SECONDS,
    10,
  );

  private readonly allowedFutureSeconds = this.parsePositiveInteger(
    process.env.COMPLIANCE_POLICY_SIGNATURE_MAX_FUTURE_SECONDS,
    20,
  );

  constructor(
    @Inject(MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE)
    private readonly mutateComplianceAddressPolicyUseCase: MutateComplianceAddressPolicyUseCase,
    @Inject(COMPLIANCE_IDEMPOTENCY_PORT)
    private readonly complianceIdempotency: ComplianceIdempotencyPort,
    @Inject(COMPLIANCE_POLICY_MUTATION_HISTORY_PORT)
    private readonly compliancePolicyMutationHistory: CompliancePolicyMutationHistoryPort,
  ) {}

  async execute(
    input: SecureMutateComplianceAddressPolicyInput,
  ): Promise<SecureMutateComplianceAddressPolicyResult> {
    if (!this.secret) {
      throw new InternalServerErrorException(
        'COMPLIANCE_POLICY_HMAC_SECRET is not configured',
      );
    }

    const validated = this.validateAndNormalizeInput(input);
    this.assertTimestampWindow(validated.timestamp);
    this.assertSignature(validated);

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
    input: SecureMutateComplianceAddressPolicyInput,
  ): SecureMutateComplianceAddressPolicyInput {
    const parsed = securePolicyMutationInputSchema.safeParse(input);
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
      signature: parsed.data.signature.trim().toLowerCase(),
      timestamp: parsed.data.timestamp.trim(),
      requestedBy: parsed.data.requestedBy?.trim() ?? null,
      confirmPolicySwitch: parsed.data.confirmPolicySwitch ?? false,
    };
  }

  private assertTimestampWindow(rawTimestamp: string): void {
    const timestamp = Number.parseInt(rawTimestamp, 10);
    if (!Number.isInteger(timestamp)) {
      throw new UnauthorizedException('Invalid signature timestamp');
    }

    const now = Math.floor(Date.now() / 1000);
    const minAllowed = now - this.allowedPastSeconds;
    const maxAllowed = now + this.allowedFutureSeconds;

    if (timestamp < minAllowed || timestamp > maxAllowed) {
      throw new UnauthorizedException('Signature timestamp is out of window');
    }
  }

  private assertSignature(
    input: SecureMutateComplianceAddressPolicyInput,
  ): void {
    const actual = input.signature;

    const expectedSignatures = input.idempotencyKey
      ? [this.createSignature(input, true)]
      : [this.createSignature(input, true), this.createSignature(input, false)];

    const isValid = expectedSignatures.some((expected) =>
      this.isMatchingSignature(expected, actual),
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  private createSignature(
    input: SecureMutateComplianceAddressPolicyInput,
    includeIdempotencyKey: boolean,
  ): string {
    const payload = includeIdempotencyKey
      ? [
          input.timestamp,
          input.idempotencyKey ?? '',
          input.action,
          input.policy,
          input.network,
          input.address,
          input.confirmPolicySwitch ? '1' : '0',
        ].join('\n')
      : [
          input.timestamp,
          input.action,
          input.policy,
          input.network,
          input.address,
          input.confirmPolicySwitch ? '1' : '0',
        ].join('\n');

    return createHmac('sha256', this.secret!).update(payload).digest('hex');
  }

  private createRequestHash(
    input: SecureMutateComplianceAddressPolicyInput,
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

  private parsePositiveInteger(
    raw: string | undefined,
    fallback: number,
  ): number {
    if (!raw) {
      return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private toZodIssueMessage(error: z.ZodError): string {
    const firstIssue = error.issues[0];
    return firstIssue
      ? firstIssue.message
      : 'Invalid secured policy mutation request';
  }

  private isMatchingSignature(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(actual, 'utf8');
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  }
}

export const SecureMutateComplianceAddressPolicyProvider = {
  provide: SECURE_MUTATE_COMPLIANCE_ADDRESS_POLICY_USE_CASE,
  useExisting: SecureMutateComplianceAddressPolicyService,
};
