import { BadRequestException } from '@nestjs/common';
import { CompliancePolicyController } from './compliance-policy.controller';
import type { SecureMutateComplianceAddressPolicyUseCase } from '../../../application/ports/inbound/secure-mutate-compliance-address-policy.use-case';
import type { ListComplianceAddressPolicyUseCase } from '../../../application/ports/inbound/list-compliance-address-policy.use-case';
import type { ListCompliancePolicyMutationHistoryUseCase } from '../../../application/ports/inbound/list-compliance-policy-mutation-history.use-case';

describe('CompliancePolicyController', () => {
  let secureUseCase: jest.Mocked<SecureMutateComplianceAddressPolicyUseCase>;
  let listUseCase: jest.Mocked<ListComplianceAddressPolicyUseCase>;
  let historyUseCase: jest.Mocked<ListCompliancePolicyMutationHistoryUseCase>;
  let controller: CompliancePolicyController;

  beforeEach(() => {
    secureUseCase = {
      execute: jest.fn(),
    };
    listUseCase = {
      execute: jest.fn(),
    };
    historyUseCase = {
      execute: jest.fn(),
    };
    controller = new CompliancePolicyController(
      secureUseCase,
      listUseCase,
      historyUseCase,
    );
  });

  it('calls secure use case for blacklist add endpoint', async () => {
    secureUseCase.execute.mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
      idempotencyKey: 'idem-1',
      replayed: false,
    });

    const result = await controller.addToBlacklist(
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
      },
      {
        'x-idempotency-key': 'idem-1',
        'x-timestamp': '1700000000',
        'x-signature':
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    );

    expect(secureUseCase.execute).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      idempotencyKey: 'idem-1',
      timestamp: '1700000000',
      signature:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      requestedBy: null,
    });
    expect(result.changed).toBe(true);
  });

  it('allows missing x-idempotency-key header', async () => {
    secureUseCase.execute.mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
      idempotencyKey: '',
      replayed: false,
    });

    await controller.addToBlacklist(
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
      },
      {
        'x-timestamp': '1700000000',
        'x-signature':
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    );

    expect(secureUseCase.execute).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      idempotencyKey: null,
      timestamp: '1700000000',
      signature:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      requestedBy: null,
    });
  });

  it('throws bad request when required headers are missing', async () => {
    await expect(
      controller.removeFromWhitelist(
        {
          address: '0x1234567890abcdef1234567890abcdef12345678',
          network: 'eip155:1',
        },
        {
          'x-idempotency-key': 'idem-2',
          'x-signature':
            'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws bad request for non-object request body', async () => {
    await expect(
      controller.addToBlacklist(null, {
        'x-idempotency-key': 'idem-1',
        'x-timestamp': '1700000000',
        'x-signature':
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    ).rejects.toThrow('Request body must be a JSON object');
  });

  it('returns blacklist entries', async () => {
    listUseCase.execute.mockResolvedValue([
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
      },
    ]);

    const result = await controller.getBlacklist();

    expect(listUseCase.execute).toHaveBeenCalledWith({
      policy: 'blacklist',
    });
    expect(result).toHaveLength(1);
  });

  it('returns history with parsed limit', async () => {
    historyUseCase.execute.mockResolvedValue([]);

    await controller.getHistory({ limit: '200' });

    expect(historyUseCase.execute).toHaveBeenCalledWith({
      limit: 200,
    });
  });
});
