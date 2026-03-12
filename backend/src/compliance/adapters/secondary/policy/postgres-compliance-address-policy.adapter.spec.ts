import type { Repository } from 'typeorm';
import { PostgresComplianceAddressPolicyAdapter } from './postgres-compliance-address-policy.adapter';
import type { ComplianceAddressPolicyOrmEntity } from '../persistence/typeorm/entities';

interface MockPolicyRepository {
  existsBy: jest.Mock<Promise<boolean>, [Record<string, unknown>]>;
  createQueryBuilder: jest.Mock;
  delete: jest.Mock<
    Promise<{ affected?: number | null }>,
    [Record<string, unknown>]
  >;
  find: jest.Mock<
    Promise<ComplianceAddressPolicyOrmEntity[]>,
    [Record<string, unknown>]
  >;
}

describe('PostgresComplianceAddressPolicyAdapter', () => {
  let repository: MockPolicyRepository;
  let adapter: PostgresComplianceAddressPolicyAdapter;

  beforeEach(() => {
    repository = {
      existsBy: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };

    adapter = new PostgresComplianceAddressPolicyAdapter(
      repository as unknown as Repository<ComplianceAddressPolicyOrmEntity>,
    );
  });

  it('returns blacklist when address exists in blacklist', async () => {
    repository.existsBy.mockResolvedValueOnce(true);

    const result = await adapter.getPolicy({
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      network: 'eip155:1',
    });

    expect(result).toBe('blacklist');
    expect(repository.existsBy).toHaveBeenCalledTimes(1);
    expect(repository.existsBy).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
    });
  });

  it('returns whitelist when not blacklisted but present in whitelist', async () => {
    repository.existsBy
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await adapter.getPolicy({
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      network: 'eip155:1',
    });

    expect(result).toBe('whitelist');
    expect(repository.existsBy).toHaveBeenNthCalledWith(1, {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
    });
    expect(repository.existsBy).toHaveBeenNthCalledWith(2, {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
    });
  });

  it('returns null when address is in neither list', async () => {
    repository.existsBy
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    const result = await adapter.getPolicy({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
    });

    expect(result).toBeNull();
  });

  it('adds new entry and returns changed=true', async () => {
    const execute = jest.fn().mockResolvedValue({ identifiers: [{ id: '1' }] });
    const orIgnore = jest.fn().mockReturnValue({ execute });
    const values = jest.fn().mockReturnValue({ orIgnore });
    const into = jest.fn().mockReturnValue({ values });
    const insert = jest.fn().mockReturnValue({ into });
    repository.createQueryBuilder.mockReturnValue({ insert });

    const changed = await adapter.add({
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      network: 'eip155:1',
      policy: 'blacklist',
    });

    expect(changed).toBe(true);
    expect(values).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
    });
  });

  it('returns changed=false when add is ignored by unique constraint', async () => {
    const execute = jest.fn().mockResolvedValue({ identifiers: [] });
    const orIgnore = jest.fn().mockReturnValue({ execute });
    const values = jest.fn().mockReturnValue({ orIgnore });
    const into = jest.fn().mockReturnValue({ values });
    const insert = jest.fn().mockReturnValue({ into });
    repository.createQueryBuilder.mockReturnValue({ insert });

    const changed = await adapter.add({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
    });

    expect(changed).toBe(false);
  });

  it('returns exists=true when exact policy entry is present', async () => {
    repository.existsBy.mockResolvedValue(true);

    const exists = await adapter.exists({
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      network: 'eip155:1',
      policy: 'whitelist',
    });

    expect(exists).toBe(true);
    expect(repository.existsBy).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'whitelist',
    });
  });

  it('removes entry and returns true when row was affected', async () => {
    repository.delete.mockResolvedValue({ affected: 1 });

    const changed = await adapter.remove({
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      network: 'eip155:1',
      policy: 'blacklist',
    });

    expect(changed).toBe(true);
    expect(repository.delete).toHaveBeenCalledWith({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      policy: 'blacklist',
    });
  });

  it('lists entries by policy ordered by network and address', async () => {
    repository.find.mockResolvedValue([
      {
        id: '2',
        address: '0xbbb',
        network: 'eip155:10',
        policy: 'whitelist',
      },
      {
        id: '1',
        address: '0xaaa',
        network: 'eip155:1',
        policy: 'whitelist',
      },
    ] as ComplianceAddressPolicyOrmEntity[]);

    const result = await adapter.list('whitelist');

    expect(repository.find).toHaveBeenCalledWith({
      where: { policy: 'whitelist' },
      order: {
        network: 'ASC',
        address: 'ASC',
      },
    });
    expect(result).toEqual([
      {
        address: '0xbbb',
        network: 'eip155:10',
      },
      {
        address: '0xaaa',
        network: 'eip155:1',
      },
    ]);
  });
});
