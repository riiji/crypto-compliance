import type { Queue, QueueEvents } from 'bullmq';
import { BullComplianceProviderAdapter } from './bull-compliance-provider.adapter';
import { ComplianceProviderRequestError } from '../../../domain/errors/compliance-provider.error';
import { COMPLIANCE_PROVIDER_CHECK_JOB_NAME } from './compliance-provider.queue';

describe('BullComplianceProviderAdapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      COMPLIANCE_PROVIDER_MAX_RETRIES: '5',
      COMPLIANCE_PROVIDER_RETRY_DELAY_MS: '500',
      COMPLIANCE_PROVIDER_QUEUE_WAIT_TIMEOUT_MS: '60000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('enqueues a job with retries and returns a parsed domain result', async () => {
    const waitUntilFinished = jest.fn().mockResolvedValue({
      address: '0x123',
      network: 'eip155:1',
      status: 'ready',
      riskScore: 0.2,
      signals: null,
      checkedAt: '2026-03-11T00:00:00.000Z',
      assessmentSource: 'provider',
      retrievalSource: 'provider',
      isHighRisk: false,
    });
    const add = jest.fn().mockResolvedValue({
      waitUntilFinished,
    });

    const queue = {
      add,
      opts: {
        connection: {},
      },
    } as unknown as Queue;

    const adapter = new BullComplianceProviderAdapter(queue);
    Reflect.set(adapter as object, 'queueEvents', {} as QueueEvents);

    const result = await adapter.checkAddress({
      address: ' 0x123 ',
      network: ' eip155:1 ',
    });

    expect(add).toHaveBeenCalledWith(
      COMPLIANCE_PROVIDER_CHECK_JOB_NAME,
      {
        address: '0x123',
        network: 'eip155:1',
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
      },
    );
    expect(waitUntilFinished).toHaveBeenCalledTimes(1);
    expect(result.checkedAt).toEqual(new Date('2026-03-11T00:00:00.000Z'));
  });

  it('throws ComplianceProviderRequestError when queued job fails', async () => {
    const waitUntilFinished = jest
      .fn()
      .mockRejectedValue(new Error('provider timeout'));
    const add = jest.fn().mockResolvedValue({
      waitUntilFinished,
    });

    const queue = {
      add,
      opts: {
        connection: {},
      },
    } as unknown as Queue;

    const adapter = new BullComplianceProviderAdapter(queue);
    Reflect.set(adapter as object, 'queueEvents', {} as QueueEvents);

    await expect(
      adapter.checkAddress({
        address: '0x123',
        network: 'eip155:1',
      }),
    ).rejects.toBeInstanceOf(ComplianceProviderRequestError);
  });
});
