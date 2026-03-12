import { BadRequestException } from '@nestjs/common';
import { MutateComplianceAddressPolicyService } from './mutate-compliance-address-policy.service';
import type { ComplianceAddressPolicyPort } from '../ports/outbound/compliance-address-policy.port';

describe('MutateComplianceAddressPolicyService', () => {
  let policy: jest.Mocked<ComplianceAddressPolicyPort>;
  let service: MutateComplianceAddressPolicyService;

  beforeEach(() => {
    policy = {
      getPolicy: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      list: jest.fn(),
    };
    service = new MutateComplianceAddressPolicyService(policy);
  });

  it('adds normalized eip155 entry', async () => {
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
