export type ComplianceCheckStatus = 'ready' | 'in_progress';
export type ComplianceAssessmentSource = 'provider' | 'blacklist' | 'whitelist';
export type ComplianceRetrievalSource = 'provider' | 'cache' | 'policy';

export interface ComplianceSignal {
  category: string;
  score: number;
}

export type ComplianceJsonPrimitive = string | number | boolean | null;
export type ComplianceJsonValue =
  | ComplianceJsonPrimitive
  | ComplianceJsonObject
  | ComplianceJsonValue[];

export interface ComplianceJsonObject {
  [key: string]: ComplianceJsonValue;
}

export type ComplianceProviderResponsePayload = ComplianceJsonObject;

export interface ComplianceCheckResult {
  address: string;
  network: string;
  status: ComplianceCheckStatus;
  riskScore: number | null;
  signals: ComplianceSignal[] | null;
  checkedAt: Date | null;
  assessmentSource: ComplianceAssessmentSource;
  retrievalSource: ComplianceRetrievalSource;
  isHighRisk: boolean;
  providerResponsePayload: ComplianceProviderResponsePayload | null;
}
