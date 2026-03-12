import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { SecureMutateComplianceAddressPolicyService } from './secure-mutate-compliance-address-policy.service';
import type { ComplianceIdempotencyPort } from '../ports/outbound/compliance-idempotency.port';
import type { CompliancePolicyMutationHistoryPort } from '../ports/outbound/compliance-policy-mutation-history.port';
import type { MutateComplianceAddressPolicyUseCase } from '../ports/inbound/mutate-compliance-address-policy.use-case';

describe('SecureMutateComplianceAddressPolicyService', () => {
  const originalSecret = process.env.COMPLIANCE_POLICY_HMAC_SECRET;
  let mutate: jest.Mocked<MutateComplianceAddressPolicyUseCase>;
  let idempotency: jest.Mocked<ComplianceIdempotencyPort>;
  let mutationHistory: jest.Mocked<CompliancePolicyMutationHistoryPort>;
  let service: SecureMutateComplianceAddressPolicyService;

  beforeEach(() => {
    process.env.COMPLIANCE_POLICY_HMAC_SECRET = 'test-secret';
    mutate = {
      execute: jest.fn(),
    };
    idempotency = {
      executeOnce: jest.fn(async ({ action }) => ({
        result: await action(),
        replayed: false,
      })),
    };
    mutationHistory = {
      append: jest.fn(),
      list: jest.fn(),
    };
    service = new SecureMutateComplianceAddressPolicyService(
      mutate,
      idempotency,
      mutationHistory,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.COMPLIANCE_POLICY_HMAC_SECRET;
    } else {
      process.env.COMPLIANCE_POLICY_HMAC_SECRET = originalSecret;
    }
  });

  it('validates signature and executes mutation idempotently', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    mutate.execute.mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
    });

    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const signature = createHmac('sha256', 'test-secret')
      .update(
        [
          timestamp,
          'idem-1',
          'add',
          'blacklist',
          'eip155:1',
          '0x1234567890abcdef1234567890abcdef12345678',
          '0',
        ].join('\n'),
      )
      .digest('hex');

    const result = await service.execute({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      idempotencyKey: 'idem-1',
      timestamp,
      signature,
    });

    expect(idempotency.executeOnce).toHaveBeenCalledTimes(1);
    expect(mutate.execute).toHaveBeenCalledTimes(1);
    expect(mutate.execute).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      confirmPolicySwitch: false,
    });
    expect(mutationHistory.append).toHaveBeenCalledTimes(1);
    expect(result.replayed).toBe(false);
    expect(result.idempotencyKey).toBe('idem-1');
  });

  it('rejects request outside timestamp window', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const signature = createHmac('sha256', 'test-secret')
      .update(
        [
          '1699999900',
          'idem-2',
          'add',
          'whitelist',
          'eip155:1',
          '0x1234567890abcdef1234567890abcdef12345678',
          '0',
        ].join('\n'),
      )
      .digest('hex');

    await expect(
      service.execute({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
        policy: 'whitelist',
        action: 'add',
        idempotencyKey: 'idem-2',
        timestamp: '1699999900',
        signature,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid signature', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    await expect(
      service.execute({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
        policy: 'whitelist',
        action: 'remove',
        idempotencyKey: 'idem-3',
        timestamp: `${Math.floor(Date.now() / 1000)}`,
        signature:
          '0000000000000000000000000000000000000000000000000000000000000000',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows missing idempotency key and skips idempotency deduplication', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    mutate.execute.mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
    });

    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const signature = createHmac('sha256', 'test-secret')
      .update(
        [
          timestamp,
          'add',
          'blacklist',
          'eip155:1',
          '0x1234567890abcdef1234567890abcdef12345678',
          '0',
        ].join('\n'),
      )
      .digest('hex');

    const result = await service.execute({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      timestamp,
      signature,
    });

    expect(idempotency.executeOnce).not.toHaveBeenCalled();
    expect(mutate.execute).toHaveBeenCalledTimes(1);
    expect(result.replayed).toBe(false);
    expect(result.idempotencyKey).toBe('');
  });

  it('accepts confirmPolicySwitch=true when signature includes confirmation bit', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    mutate.execute.mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
    });

    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const signature = createHmac('sha256', 'test-secret')
      .update(
        [
          timestamp,
          'idem-switch',
          'add',
          'blacklist',
          'eip155:1',
          '0x1234567890abcdef1234567890abcdef12345678',
          '1',
        ].join('\n'),
      )
      .digest('hex');

    await service.execute({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      idempotencyKey: 'idem-switch',
      confirmPolicySwitch: true,
      timestamp,
      signature,
    });

    expect(mutate.execute).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      confirmPolicySwitch: true,
    });
  });
});
