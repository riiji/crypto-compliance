import 'server-only';

import { randomUUID } from 'node:crypto';

export type CompliancePolicy = 'blacklist' | 'whitelist';
export type CompliancePolicyAction = 'add' | 'remove';

export interface CompliancePolicyEntry {
  address: string;
  network: string;
}

export interface CompliancePolicyMutationResponse {
  address: string;
  network: string;
  policy: CompliancePolicy;
  action: CompliancePolicyAction;
  changed: boolean;
  idempotencyKey: string;
  replayed: boolean;
}

export interface CompliancePolicyMutationHistoryRecord {
  address: string;
  network: string;
  policy: CompliancePolicy;
  action: CompliancePolicyAction;
  changed: boolean;
  idempotencyKey: string;
  createdAt: string;
}

export class UpstreamApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const DEFAULT_BACKEND_BASE_URL = 'http://localhost:3000';

function backendBaseUrl(): string {
  const configured = process.env.BACKEND_API_BASE_URL?.trim();
  if (!configured) {
    return DEFAULT_BACKEND_BASE_URL;
  }

  return configured.endsWith('/') ? configured.slice(0, -1) : configured;
}

function normalizeNetwork(value: string): string {
  return value.trim();
}

function normalizeAddress(value: string): string {
  return value.trim();
}

async function parseMaybeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const body = await parseMaybeJson(response);
  const message =
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
      ? body.message
      : `Upstream API request failed with ${response.status}`;

  throw new UpstreamApiError(message, response.status, body);
}

export async function fetchPolicyList(
  policy: CompliancePolicy,
): Promise<CompliancePolicyEntry[]> {
  const response = await fetch(
    `${backendBaseUrl()}/compliance/policies/${policy}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  );

  await throwIfNotOk(response);
  const payload = await parseMaybeJson(response);

  return Array.isArray(payload) ? (payload as CompliancePolicyEntry[]) : [];
}

export async function fetchPolicyHistory(
  limit?: number,
): Promise<CompliancePolicyMutationHistoryRecord[]> {
  const query = Number.isInteger(limit) && limit && limit > 0 ? `?limit=${limit}` : '';
  const response = await fetch(
    `${backendBaseUrl()}/compliance/policies/history${query}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  );

  await throwIfNotOk(response);
  const payload = await parseMaybeJson(response);

  return Array.isArray(payload)
    ? (payload as CompliancePolicyMutationHistoryRecord[])
    : [];
}

export async function mutatePolicy(input: {
  policy: CompliancePolicy;
  action: CompliancePolicyAction;
  address: string;
  network: string;
  idempotencyKey?: string;
  confirmPolicySwitch?: boolean;
}): Promise<CompliancePolicyMutationResponse> {
  const network = normalizeNetwork(input.network);
  const address = normalizeAddress(input.address);
  const confirmPolicySwitch = input.confirmPolicySwitch ?? false;
  const idempotencyKey = input.idempotencyKey ?? randomUUID();
  const method = input.action === 'add' ? 'POST' : 'DELETE';
  const response = await fetch(
    `${backendBaseUrl()}/compliance/admin/policies/${input.policy}`,
    {
      method,
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        address,
        network,
        confirmPolicySwitch,
      }),
    },
  );

  await throwIfNotOk(response);
  const payload = await parseMaybeJson(response);

  return payload as CompliancePolicyMutationResponse;
}
