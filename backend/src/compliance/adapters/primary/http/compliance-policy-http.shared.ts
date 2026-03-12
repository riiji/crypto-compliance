import { BadRequestException } from '@nestjs/common';
import type { CompliancePolicyMutationAction } from '../../../application/ports/inbound/mutate-compliance-address-policy.use-case';
import type { ComplianceAddressPolicy } from '../../../application/ports/outbound/compliance-address-policy.port';
import type { CompliancePolicyMutationHistoryRecord } from '../../../application/ports/outbound/compliance-policy-mutation-history.port';

export interface CompliancePolicyMutationBodyDto {
  address: string;
  network: string;
  confirmPolicySwitch: boolean;
}

export interface CompliancePolicyHistoryQueryDto {
  limit?: string;
}

export interface CompliancePolicyEntryDto {
  address: string;
  network: string;
}

export interface CompliancePolicyMutationResponseDto {
  address: string;
  network: string;
  policy: ComplianceAddressPolicy;
  action: CompliancePolicyMutationAction;
  changed: boolean;
  idempotencyKey: string;
  replayed: boolean;
}

export function requireHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string {
  const value = optionalHeader(headers, name);
  if (value === null) {
    throw new BadRequestException(`${name} header is required`);
  }

  return value;
}

export function optionalHeader(
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

export function requireMutationBody(
  body: unknown,
): CompliancePolicyMutationBodyDto {
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

export function maskAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 10) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

export type { CompliancePolicyMutationHistoryRecord };
