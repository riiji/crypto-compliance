import { isHighRiskFromProvider } from './risk-evaluation';

describe('isHighRiskFromProvider', () => {
  it('returns true when risk score is at threshold', () => {
    expect(
      isHighRiskFromProvider({
        riskScore: 0.6,
        signals: null,
      }),
    ).toBe(true);
  });

  it('returns true when stolen_coins signal is at threshold', () => {
    expect(
      isHighRiskFromProvider({
        riskScore: 0.2,
        signals: [
          { category: 'stolen_coins', score: 0.25 },
          { category: 'mixer', score: 0.9 },
        ],
      }),
    ).toBe(true);
  });

  it('returns false when both conditions are below thresholds', () => {
    expect(
      isHighRiskFromProvider({
        riskScore: 0.59,
        signals: [{ category: 'stolen_coins', score: 0.24 }],
      }),
    ).toBe(false);
  });
});
