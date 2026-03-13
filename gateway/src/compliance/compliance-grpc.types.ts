import type { Observable } from "rxjs";

export const COMPLIANCE_SERVICE_NAME = "ComplianceService";

export enum GrpcCompliancePolicy {
  COMPLIANCE_POLICY_UNSPECIFIED = 0,
  COMPLIANCE_POLICY_BLACKLIST = 1,
  COMPLIANCE_POLICY_WHITELIST = 2,
}

export enum GrpcCompliancePolicyAction {
  COMPLIANCE_POLICY_ACTION_UNSPECIFIED = 0,
  COMPLIANCE_POLICY_ACTION_ADD = 1,
  COMPLIANCE_POLICY_ACTION_REMOVE = 2,
}

export interface CompliancePolicyEntry {
  address: string;
  network: string;
}

export interface ListCompliancePoliciesRequest {
  policy: GrpcCompliancePolicy;
}

export interface ListCompliancePoliciesResponse {
  entries: CompliancePolicyEntry[];
}

export interface CompliancePolicyMutationHistoryRecord {
  address: string;
  network: string;
  policy: GrpcCompliancePolicy;
  action: GrpcCompliancePolicyAction;
  changed: boolean;
  idempotencyKey: string;
  createdAt: string;
}

export interface ListCompliancePolicyMutationHistoryRequest {
  limit?: number;
}

export interface ListCompliancePolicyMutationHistoryResponse {
  records: CompliancePolicyMutationHistoryRecord[];
}

export interface SecureMutateCompliancePolicyRequest {
  address: string;
  network: string;
  policy: GrpcCompliancePolicy;
  action: GrpcCompliancePolicyAction;
  confirmPolicySwitch: boolean;
  idempotencyKey?: string;
  timestamp: string;
  signature: string;
  requestedBy?: string;
}

export interface TrustedMutateCompliancePolicyRequest {
  address: string;
  network: string;
  policy: GrpcCompliancePolicy;
  action: GrpcCompliancePolicyAction;
  confirmPolicySwitch: boolean;
  idempotencyKey?: string;
  requestedBy?: string;
  timestamp: string;
  signature: string;
}

export interface CompliancePolicyMutationResponse {
  address: string;
  network: string;
  policy: GrpcCompliancePolicy;
  action: GrpcCompliancePolicyAction;
  changed: boolean;
  idempotencyKey: string;
  replayed: boolean;
}

export interface ComplianceServiceClient {
  listCompliancePolicies(
    request: ListCompliancePoliciesRequest,
  ): Observable<ListCompliancePoliciesResponse>;

  listCompliancePolicyMutationHistory(
    request: ListCompliancePolicyMutationHistoryRequest,
  ): Observable<ListCompliancePolicyMutationHistoryResponse>;

  secureMutateCompliancePolicy(
    request: SecureMutateCompliancePolicyRequest,
  ): Observable<CompliancePolicyMutationResponse>;

  trustedMutateCompliancePolicy(
    request: TrustedMutateCompliancePolicyRequest,
  ): Observable<CompliancePolicyMutationResponse>;
}
