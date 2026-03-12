import { SuwardComplianceProviderAdapter } from './suward-compliance-provider.adapter';
import {
  ComplianceProviderConfigurationError,
  ComplianceProviderValidationError,
} from '../../../domain/errors/compliance-provider.error';

describe('SuwardComplianceProviderAdapter', () => {
  const originalApiKey = process.env.COMPLIANCE_API_KEY;
  const originalApiUrl = process.env.COMPLIANCE_API_URL;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.COMPLIANCE_API_KEY = 'test-api-key';
    process.env.COMPLIANCE_API_URL = 'https://example.com/compliance-check';
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          address: '0x1234567890abcdef1234567890abcdef12345678',
          network: 'eip155:1',
          status: 'ready',
          risk_score: 0.75,
          signals: [
            {
              category: 'stolen_coins',
              score: 0.3,
            },
          ],
          checked_at: '2025-01-15T12:00:00Z',
        }),
        { status: 200 },
      ),
    );
  });

  afterAll(() => {
    process.env.COMPLIANCE_API_KEY = originalApiKey;
    process.env.COMPLIANCE_API_URL = originalApiUrl;
  });

  it('rejects empty address and does not call fetch', async () => {
    const adapter = new SuwardComplianceProviderAdapter();

    await expect(
      adapter.checkAddress({
        address: '   ',
        network: 'eip155:1',
      }),
    ).rejects.toBeInstanceOf(ComplianceProviderValidationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects empty network and does not call fetch', async () => {
    const adapter = new SuwardComplianceProviderAdapter();

    await expect(
      adapter.checkAddress({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: '  ',
      }),
    ).rejects.toBeInstanceOf(ComplianceProviderValidationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects non-CAIP2 network and does not call fetch', async () => {
    const adapter = new SuwardComplianceProviderAdapter();

    await expect(
      adapter.checkAddress({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155',
      }),
    ).rejects.toBeInstanceOf(ComplianceProviderValidationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid eip155 chain reference and does not call fetch', async () => {
    const adapter = new SuwardComplianceProviderAdapter();

    await expect(
      adapter.checkAddress({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:0',
      }),
    ).rejects.toBeInstanceOf(ComplianceProviderValidationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid EVM address for eip155 and does not call fetch', async () => {
    const adapter = new SuwardComplianceProviderAdapter();

    await expect(
      adapter.checkAddress({
        address: '0x1234',
        network: 'eip155:1',
      }),
    ).rejects.toBeInstanceOf(ComplianceProviderValidationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows non-eip155 addresses and sends normalized request values', async () => {
    const adapter = new SuwardComplianceProviderAdapter();

    const result = await adapter.checkAddress({
      address: '  cosmos1abcdefghijklmnopqrstuvwxzy0123456789  ',
      network: ' cosmos:cosmoshub-4 ',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchSpy.mock.calls[0];
    expect(requestUrl).toBe('https://example.com/compliance-check');
    expect(requestInit).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
      },
    });

    const parsedBody = JSON.parse((requestInit as RequestInit).body as string);
    expect(parsedBody).toEqual({
      address: 'cosmos1abcdefghijklmnopqrstuvwxzy0123456789',
      network: 'cosmos:cosmoshub-4',
    });
    expect(result.providerResponsePayload).toEqual({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'eip155:1',
      status: 'ready',
      risk_score: 0.75,
      signals: [
        {
          category: 'stolen_coins',
          score: 0.3,
        },
      ],
      checked_at: '2025-01-15T12:00:00Z',
    });
  });

  it('throws configuration error when API key is missing', async () => {
    process.env.COMPLIANCE_API_KEY = '';
    const adapter = new SuwardComplianceProviderAdapter();

    await expect(
      adapter.checkAddress({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'eip155:1',
      }),
    ).rejects.toBeInstanceOf(ComplianceProviderConfigurationError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
