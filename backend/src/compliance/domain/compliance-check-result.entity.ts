export type ComplianceCheckStatus = 'ready' | 'in_progress';
export type ComplianceAssessmentSource = 'provider' | 'blacklist' | 'whitelist';
export type ComplianceRetrievalSource = 'provider' | 'cache' | 'policy';

export interface ComplianceSignal {
  category: string;
  score: number;
}

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
}
