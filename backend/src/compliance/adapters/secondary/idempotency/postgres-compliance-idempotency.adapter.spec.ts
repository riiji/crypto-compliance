import type { DataSource, QueryRunner } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { PostgresComplianceIdempotencyAdapter } from './postgres-compliance-idempotency.adapter';
import type { CompliancePolicyMutationHistoryPort } from '../../../application/ports/outbound/compliance-policy-mutation-history.port';

describe('PostgresComplianceIdempotencyAdapter', () => {
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: jest.Mocked<DataSource>;
  let history: jest.Mocked<CompliancePolicyMutationHistoryPort>;
  let adapter: PostgresComplianceIdempotencyAdapter;

  beforeEach(() => {
    queryRunner = {
      connect: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
    } as unknown as jest.Mocked<QueryRunner>;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>;

    history = {
      append: jest.fn(),
      list: jest.fn(),
      findByIdempotencyKey: jest.fn(),
    };

    adapter = new PostgresComplianceIdempotencyAdapter(dataSource, history);
  });

  it('replays completed mutation from history when idempotency key already exists', async () => {
    queryRunner.query
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([]);
    history.findByIdempotencyKey.mockResolvedValue({
      address: '0x123',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
      idempotencyKey: 'idem-1',
      requestHash: 'hash-1',
      requestedBy: 'alice',
      createdAt: new Date('2026-03-12T00:00:00Z'),
    });
    const action = jest.fn();

    const result = await adapter.executeOnce({
      key: 'idem-1',
      requestHash: 'hash-1',
      action,
    });

    expect(action).not.toHaveBeenCalled();
    expect(history.findByIdempotencyKey).toHaveBeenCalledWith('idem-1');
    expect(result).toEqual({
      result: {
        address: '0x123',
        network: 'eip155:1',
        policy: 'blacklist',
        action: 'add',
        changed: true,
      },
      replayed: true,
    });
  });

  it('executes action once when idempotency key has no persisted history yet', async () => {
    queryRunner.query
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([]);
    history.findByIdempotencyKey.mockResolvedValue(null);
    const action = jest.fn().mockResolvedValue({
      address: '0x123',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'remove',
      changed: false,
    });

    const result = await adapter.executeOnce({
      key: 'idem-2',
      requestHash: 'hash-2',
      action,
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      result: {
        address: '0x123',
        network: 'eip155:1',
        policy: 'whitelist',
        action: 'remove',
        changed: false,
      },
      replayed: false,
    });
  });

  it('rejects reuse of an idempotency key with a different request hash', async () => {
    queryRunner.query
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([]);
    history.findByIdempotencyKey.mockResolvedValue({
      address: '0x123',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
      idempotencyKey: 'idem-3',
      requestHash: 'stored-hash',
      requestedBy: null,
      createdAt: new Date('2026-03-12T00:00:00Z'),
    });

    await expect(
      adapter.executeOnce({
        key: 'idem-3',
        requestHash: 'other-hash',
        action: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
