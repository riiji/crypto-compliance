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

export interface AuthLoginResponse {
  username: string;
  accessToken: string;
  expiresAt: string;
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

const DEFAULT_BACKEND_BASE_URL = 'http://localhost:3001';

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

export function requireAuthorizationHeader(request: Request): string {
  const header = request.headers.get('authorization')?.trim() ?? '';
  if (!header.startsWith('Bearer ')) {
    throw new UpstreamApiError('Authentication is required', 401);
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new UpstreamApiError('Authentication is required', 401);
  }

  return `Bearer ${token}`;
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
  authorization: string,
): Promise<CompliancePolicyEntry[]> {
  const response = await fetch(
    `${backendBaseUrl()}/compliance/admin/policies/${policy}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        authorization,
      },
    },
  );

  await throwIfNotOk(response);
  const payload = await parseMaybeJson(response);

  return Array.isArray(payload) ? (payload as CompliancePolicyEntry[]) : [];
}

export async function fetchPolicyHistory(
  authorization: string,
  limit?: number,
): Promise<CompliancePolicyMutationHistoryRecord[]> {
  const query = Number.isInteger(limit) && limit && limit > 0 ? `?limit=${limit}` : '';
  const response = await fetch(
    `${backendBaseUrl()}/compliance/admin/policies/history${query}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        authorization,
      },
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
  authorization: string;
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
        authorization: input.authorization,
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

export async function loginWithUsername(
  username: string,
): Promise<AuthLoginResponse> {
  const response = await fetch(`${backendBaseUrl()}/auth/login`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username: username.trim(),
    }),
  });

  await throwIfNotOk(response);
  const payload = await parseMaybeJson(response);

  return payload as AuthLoginResponse;
}
