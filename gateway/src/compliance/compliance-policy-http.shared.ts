import { BadRequestException } from "@nestjs/common";

export type CompliancePolicy = "blacklist" | "whitelist";
export type CompliancePolicyMutationAction = "add" | "remove";

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
  policy: CompliancePolicy;
  action: CompliancePolicyMutationAction;
  changed: boolean;
  idempotencyKey: string;
  replayed: boolean;
}

export interface CompliancePolicyMutationHistoryRecordDto {
  address: string;
  network: string;
  policy: CompliancePolicy;
  action: CompliancePolicyMutationAction;
  changed: boolean;
  idempotencyKey: string;
  createdAt: string;
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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Request body must be a JSON object");
  }

  const record = body as Record<string, unknown>;
  const address =
    typeof record.address === "string" ? record.address.trim() : "";
  const network =
    typeof record.network === "string" ? record.network.trim() : "";

  if (!address) {
    throw new BadRequestException("Address must not be empty");
  }

  if (!network) {
    throw new BadRequestException("Network must not be empty");
  }

  const confirmPolicySwitch =
    record.confirmPolicySwitch === undefined
      ? false
      : typeof record.confirmPolicySwitch === "boolean"
        ? record.confirmPolicySwitch
        : (() => {
            throw new BadRequestException(
              "confirmPolicySwitch must be a boolean when provided",
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
