import { TrustedMutateComplianceAddressPolicyService } from './trusted-mutate-compliance-address-policy.service';
import type { ComplianceIdempotencyPort } from '../ports/outbound/compliance-idempotency.port';
import type { CompliancePolicyMutationHistoryPort } from '../ports/outbound/compliance-policy-mutation-history.port';
import type { MutateComplianceAddressPolicyUseCase } from '../ports/inbound/mutate-compliance-address-policy.use-case';

describe('TrustedMutateComplianceAddressPolicyService', () => {
  let mutate: jest.Mocked<MutateComplianceAddressPolicyUseCase>;
  let idempotency: ComplianceIdempotencyPort;
  let executeOnceMock: jest.Mock;
  let mutationHistory: jest.Mocked<CompliancePolicyMutationHistoryPort>;
  let service: TrustedMutateComplianceAddressPolicyService;

  beforeEach(() => {
    mutate = {
      execute: jest.fn(),
    };
    executeOnceMock = jest.fn(
      async (input: { action: () => Promise<unknown> }) => ({
        result: await input.action(),
        replayed: false,
      }),
    );
    idempotency = {
      executeOnce:
        executeOnceMock as unknown as ComplianceIdempotencyPort['executeOnce'],
    };
    mutationHistory = {
      append: jest.fn(),
      list: jest.fn(),
      findByIdempotencyKey: jest.fn(),
    };
    service = new TrustedMutateComplianceAddressPolicyService(
      mutate,
      idempotency,
      mutationHistory,
    );
  });

  it('executes mutation idempotently and appends audit history', async () => {
    mutate.execute.mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
    });

    const result = await service.execute({
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      idempotencyKey: 'idem-1',
      requestedBy: 'alice',
    });

    expect(executeOnceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'idem-1',
        requestHash: expect.any(String),
      }),
    );
    expect(mutate.execute).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      confirmPolicySwitch: false,
    });
    expect(mutationHistory.append).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
        policy: 'blacklist',
        action: 'add',
        changed: true,
        idempotencyKey: 'idem-1',
        requestHash: expect.any(String),
        requestedBy: 'alice',
        createdAt: expect.any(Date),
      }),
    );
    expect(result).toEqual({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
      idempotencyKey: 'idem-1',
      replayed: false,
    });
  });

  it('allows missing idempotency key and skips deduplication', async () => {
    mutate.execute.mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'remove',
      changed: true,
    });

    const result = await service.execute({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'remove',
    });

    expect(executeOnceMock).not.toHaveBeenCalled();
    expect(mutationHistory.append).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: '',
        requestHash: null,
        requestedBy: null,
      }),
    );
    expect(result.idempotencyKey).toBe('');
    expect(result.replayed).toBe(false);
  });
});
