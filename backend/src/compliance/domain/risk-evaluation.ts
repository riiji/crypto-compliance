import type { ComplianceSignal } from './compliance-check-result.entity';

export const HIGH_RISK_SCORE_THRESHOLD = 0.6;
export const STOLEN_COINS_SIGNAL_THRESHOLD = 0.25;

export function isHighRiskFromProvider(input: {
  riskScore: number | null;
  signals: ComplianceSignal[] | null;
}): boolean {
  if (
    input.riskScore !== null &&
    input.riskScore >= HIGH_RISK_SCORE_THRESHOLD
  ) {
    return true;
  }

  if (!input.signals) {
    return false;
  }

  return input.signals.some(
    (signal) =>
      signal.category === 'stolen_coins' &&
      signal.score >= STOLEN_COINS_SIGNAL_THRESHOLD,
  );
}
