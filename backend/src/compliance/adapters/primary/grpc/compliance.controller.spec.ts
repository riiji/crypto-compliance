import { ComplianceController } from './compliance.controller';
import type { CheckAddressComplianceUseCase } from '../../../application/ports/inbound/check-address-compliance.use-case';
import {
  ComplianceAssessmentSource,
  ComplianceCheckStatus,
  ComplianceRetrievalSource,
} from '../../../compliance';

describe('ComplianceController', () => {
  let useCase: jest.Mocked<CheckAddressComplianceUseCase>;
  let controller: ComplianceController;

  beforeEach(() => {
    useCase = {
      execute: jest.fn(),
    };
    controller = new ComplianceController(useCase);
  });

  it('maps check-address-compliance use case response to grpc response', async () => {
    useCase.execute.mockResolvedValue({
      address: '0xabc',
      network: 'eip155:1',
      status: 'ready',
      riskScore: 0.75,
      signals: [{ category: 'stolen_coins', score: 0.3 }],
      checkedAt: new Date('2026-01-01T00:00:00.000Z'),
      assessmentSource: 'provider',
      retrievalSource: 'provider',
      isHighRisk: true,
    });

    const response = await controller.checkAddressCompliance({
      address: '0xabc',
      network: 'eip155:1',
    });

    expect(useCase.execute).toHaveBeenCalledWith({
      address: '0xabc',
      network: 'eip155:1',
    });
    expect(response).toEqual({
      address: '0xabc',
      network: 'eip155:1',
      status: ComplianceCheckStatus.COMPLIANCE_CHECK_STATUS_READY,
      riskScore: 0.75,
      signals: [{ category: 'stolen_coins', score: 0.3 }],
      checkedAt: '2026-01-01T00:00:00.000Z',
      assessmentSource:
        ComplianceAssessmentSource.COMPLIANCE_ASSESSMENT_SOURCE_PROVIDER,
      retrievalSource:
        ComplianceRetrievalSource.COMPLIANCE_RETRIEVAL_SOURCE_PROVIDER,
      isHighRisk: true,
    });
  });

  it('maps nullable fields to grpc optional/empty values', async () => {
    useCase.execute.mockResolvedValue({
      address: 'bc1abc',
      network: 'bip122:000000000019d6689c085ae165831e93',
      status: 'in_progress',
      riskScore: null,
      signals: null,
      checkedAt: null,
      assessmentSource: 'whitelist',
      retrievalSource: 'cache',
      isHighRisk: false,
    });

    const response = await controller.checkAddressCompliance({
      address: 'bc1abc',
      network: 'bip122:000000000019d6689c085ae165831e93',
    });

    expect(response).toEqual({
      address: 'bc1abc',
      network: 'bip122:000000000019d6689c085ae165831e93',
      status: ComplianceCheckStatus.COMPLIANCE_CHECK_STATUS_IN_PROGRESS,
      riskScore: undefined,
      signals: [],
      checkedAt: undefined,
      assessmentSource:
        ComplianceAssessmentSource.COMPLIANCE_ASSESSMENT_SOURCE_WHITELIST,
      retrievalSource:
        ComplianceRetrievalSource.COMPLIANCE_RETRIEVAL_SOURCE_CACHE,
      isHighRisk: false,
    });
  });
});
