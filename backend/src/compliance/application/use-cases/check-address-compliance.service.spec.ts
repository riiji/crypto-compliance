import { CheckAddressComplianceService } from './check-address-compliance.service';
import type { ComplianceAddressPolicyPort } from '../ports/outbound/compliance-address-policy.port';
import type { ComplianceCachePort } from '../ports/outbound/compliance-cache.port';
import type { ComplianceHistoryPort } from '../ports/outbound/compliance-history.port';
import type { ComplianceLockPort } from '../ports/outbound/compliance-lock.port';
import type { ComplianceProviderPort } from '../ports/outbound/compliance-provider.port';
import type { ComplianceCheckResult } from '../../domain/compliance-check-result.entity';

describe('CheckAddressComplianceService', () => {
  let policy: jest.Mocked<ComplianceAddressPolicyPort>;
  let cache: jest.Mocked<ComplianceCachePort>;
  let history: jest.Mocked<ComplianceHistoryPort>;
  let lock: ComplianceLockPort;
  let withAddressLockSpy: jest.SpiedFunction<
    ComplianceLockPort['withAddressLock']
  >;
  let provider: jest.Mocked<ComplianceProviderPort>;
  let service: CheckAddressComplianceService;

  const baseInput = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    network: 'eip155:1',
  };

  beforeEach(() => {
    policy = {
      getPolicy: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      list: jest.fn(),
    };

    cache = {
      get: jest.fn(),
      set: jest.fn(),
    };

    history = {
      append: jest.fn(),
    };

    lock = {
      async withAddressLock<T>(
        _input: { address: string; network: string },
        action: () => Promise<T>,
      ) {
        return action();
      },
    };
    withAddressLockSpy = jest.spyOn(lock, 'withAddressLock');

    provider = {
      checkAddress: jest.fn(),
    };

    service = new CheckAddressComplianceService(
      policy,
      cache,
      history,
      lock,
      provider,
    );
  });

  it('returns forced high-risk result for blacklist without provider call', async () => {
    policy.getPolicy.mockResolvedValue('blacklist');

    const result = await service.execute(baseInput);

    expect(provider.checkAddress).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
    expect(withAddressLockSpy).not.toHaveBeenCalled();
    expect(result.assessmentSource).toBe('blacklist');
    expect(result.retrievalSource).toBe('policy');
    expect(result.isHighRisk).toBe(true);
    expect(history.append).toHaveBeenCalledWith(result);
  });

  it('returns forced low-risk result for whitelist without provider call', async () => {
    policy.getPolicy.mockResolvedValue('whitelist');

    const result = await service.execute(baseInput);

    expect(provider.checkAddress).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
    expect(withAddressLockSpy).not.toHaveBeenCalled();
    expect(result.assessmentSource).toBe('whitelist');
    expect(result.retrievalSource).toBe('policy');
    expect(result.isHighRisk).toBe(false);
    expect(history.append).toHaveBeenCalledWith(result);
  });

  it('returns cached result when present and appends history', async () => {
    policy.getPolicy.mockResolvedValue(null);
    const cached: ComplianceCheckResult = {
      address: baseInput.address.toLowerCase(),
      network: baseInput.network,
      status: 'ready',
      riskScore: 0.3,
      signals: null,
      checkedAt: new Date('2025-01-01T00:00:00Z'),
      assessmentSource: 'provider',
      retrievalSource: 'provider',
      isHighRisk: false,
    };

    cache.get.mockResolvedValue(cached);

    const result = await service.execute(baseInput);

    expect(result).not.toBe(cached);
    expect(result).toEqual({
      ...cached,
      retrievalSource: 'cache',
    });
    expect(withAddressLockSpy).not.toHaveBeenCalled();
    expect(provider.checkAddress).not.toHaveBeenCalled();
    expect(history.append).toHaveBeenCalledWith({
      ...cached,
      retrievalSource: 'cache',
    });
  });

  it('uses provider under lock on cache miss, then writes cache and history', async () => {
    policy.getPolicy.mockResolvedValue(null);
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const providerResult: ComplianceCheckResult = {
      address: baseInput.address.toLowerCase(),
      network: baseInput.network,
      status: 'ready',
      riskScore: 0.75,
      signals: [{ category: 'stolen_coins', score: 0.3 }],
      checkedAt: new Date('2025-01-01T00:00:00Z'),
      assessmentSource: 'provider',
      retrievalSource: 'provider',
      isHighRisk: true,
    };
    provider.checkAddress.mockResolvedValue(providerResult);

    const result = await service.execute(baseInput);

    expect(withAddressLockSpy).toHaveBeenCalledTimes(1);
    expect(provider.checkAddress).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith(
      {
        address: baseInput.address.toLowerCase(),
        network: baseInput.network,
      },
      providerResult,
      3600,
    );
    expect(history.append).toHaveBeenCalledWith(providerResult);
    expect(result).toEqual(providerResult);
  });
});
