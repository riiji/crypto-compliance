import { BadRequestException, ConflictException } from '@nestjs/common';
import { MutateComplianceAddressPolicyService } from './mutate-compliance-address-policy.service';
import type { ComplianceAddressPolicyPort } from '../ports/outbound/compliance-address-policy.port';

describe('MutateComplianceAddressPolicyService', () => {
  let policy: jest.Mocked<ComplianceAddressPolicyPort>;
  let service: MutateComplianceAddressPolicyService;

  beforeEach(() => {
    policy = {
      getPolicy: jest.fn(),
      exists: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      list: jest.fn(),
    };
    service = new MutateComplianceAddressPolicyService(policy);
  });

  it('adds normalized eip155 entry', async () => {
    policy.exists.mockResolvedValue(false);
    policy.add.mockResolvedValue(true);

    const result = await service.execute({
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
    });

    expect(policy.add).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
    });
    expect(result.changed).toBe(true);
  });

  it('requires confirmation when moving whitelist entry to blacklist', async () => {
    policy.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(
      service.execute({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
        policy: 'blacklist',
        action: 'add',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(policy.remove).not.toHaveBeenCalled();
    expect(policy.add).not.toHaveBeenCalled();
  });

  it('replaces opposite policy when confirmed and keeps invariant', async () => {
    policy.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    policy.remove.mockResolvedValue(true);
    policy.add.mockResolvedValue(true);

    const result = await service.execute({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      confirmPolicySwitch: true,
    });

    expect(policy.remove).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
    });
    expect(result.changed).toBe(true);
  });

  it('moves blacklist entry to whitelist without extra confirmation', async () => {
    policy.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    policy.remove.mockResolvedValue(true);
    policy.add.mockResolvedValue(true);

    const result = await service.execute({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'add',
    });

    expect(policy.remove).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
    });
    expect(result.changed).toBe(true);
  });

  it('removes entry and returns changed=false when nothing removed', async () => {
    policy.remove.mockResolvedValue(false);

    const result = await service.execute({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'remove',
    });

    expect(policy.remove).toHaveBeenCalledTimes(1);
    expect(result.changed).toBe(false);
  });

  it('throws bad request on invalid eip155 network', async () => {
    await expect(
      service.execute({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:0',
        policy: 'blacklist',
        action: 'add',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
