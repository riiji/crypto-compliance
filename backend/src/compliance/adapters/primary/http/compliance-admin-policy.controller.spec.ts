import { BadRequestException } from '@nestjs/common';
import { ComplianceAdminPolicyController } from './compliance-admin-policy.controller';
import type { TrustedMutateComplianceAddressPolicyUseCase } from '../../../application/ports/inbound/trusted-mutate-compliance-address-policy.use-case';

describe('ComplianceAdminPolicyController', () => {
  let trustedUseCase: jest.Mocked<TrustedMutateComplianceAddressPolicyUseCase>;
  let controller: ComplianceAdminPolicyController;

  beforeEach(() => {
    trustedUseCase = {
      execute: jest.fn(),
    };
    controller = new ComplianceAdminPolicyController(trustedUseCase);
  });

  it('calls trusted use case for blacklist add endpoint without HMAC headers', async () => {
    trustedUseCase.execute.mockResolvedValue({
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
        'x-user-id': 'alice',
      },
    );

    expect(trustedUseCase.execute).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      confirmPolicySwitch: false,
      idempotencyKey: 'idem-1',
      requestedBy: 'alice',
    });
    expect(result.changed).toBe(true);
  });

  it('allows missing x-idempotency-key header on admin endpoints', async () => {
    trustedUseCase.execute.mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'remove',
      changed: true,
      idempotencyKey: '',
      replayed: false,
    });

    await controller.removeFromWhitelist(
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
      },
      {},
    );

    expect(trustedUseCase.execute).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'remove',
      confirmPolicySwitch: false,
      idempotencyKey: null,
      requestedBy: null,
    });
  });

  it('throws bad request for non-object request body', async () => {
    await expect(controller.addToBlacklist(null, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
