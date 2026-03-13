import { ComplianceController } from './compliance.controller';
import type { CheckAddressComplianceUseCase } from '../../../application/ports/inbound/check-address-compliance.use-case';
import {
  ComplianceAssessmentSource,
  ComplianceCheckStatus,
  CompliancePolicy,
  CompliancePolicyAction,
  ComplianceRetrievalSource,
} from '../../../compliance';
import type { ListComplianceAddressPolicyUseCase } from '../../../application/ports/inbound/list-compliance-address-policy.use-case';
import type { ListCompliancePolicyMutationHistoryUseCase } from '../../../application/ports/inbound/list-compliance-policy-mutation-history.use-case';
import type { SecureMutateComplianceAddressPolicyUseCase } from '../../../application/ports/inbound/secure-mutate-compliance-address-policy.use-case';
import type { TrustedMutateComplianceAddressPolicyUseCase } from '../../../application/ports/inbound/trusted-mutate-compliance-address-policy.use-case';

describe('ComplianceController', () => {
  let useCase: jest.Mocked<CheckAddressComplianceUseCase>;
  let listPoliciesUseCase: jest.Mocked<ListComplianceAddressPolicyUseCase>;
  let listHistoryUseCase: jest.Mocked<ListCompliancePolicyMutationHistoryUseCase>;
  let secureMutateUseCase: jest.Mocked<SecureMutateComplianceAddressPolicyUseCase>;
  let trustedMutateUseCase: jest.Mocked<TrustedMutateComplianceAddressPolicyUseCase>;
  let controller: ComplianceController;

  beforeEach(() => {
    useCase = {
      execute: jest.fn(),
    };
    listPoliciesUseCase = {
      execute: jest.fn(),
    };
    listHistoryUseCase = {
      execute: jest.fn(),
    };
    secureMutateUseCase = {
      execute: jest.fn(),
    };
    trustedMutateUseCase = {
      execute: jest.fn(),
    };
    controller = new ComplianceController(
      useCase,
      listPoliciesUseCase,
      listHistoryUseCase,
      secureMutateUseCase,
      trustedMutateUseCase,
    );
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
      providerResponsePayload: {
        address: '0xabc',
        network: 'eip155:1',
        status: 'ready',
      },
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
      providerResponsePayload: null,
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

  it('maps list policies requests and responses', async () => {
    listPoliciesUseCase.execute.mockResolvedValue([
      {
        address: '0xabc',
        network: 'eip155:1',
      },
    ]);

    const response = await controller.listCompliancePolicies({
      policy: CompliancePolicy.COMPLIANCE_POLICY_BLACKLIST,
    });

    expect(listPoliciesUseCase.execute).toHaveBeenCalledWith({
      policy: 'blacklist',
    });
    expect(response).toEqual({
      entries: [
        {
          address: '0xabc',
          network: 'eip155:1',
        },
      ],
    });
  });

  it('maps mutation history to grpc response', async () => {
    listHistoryUseCase.execute.mockResolvedValue([
      {
        address: '0xabc',
        network: 'eip155:1',
        policy: 'whitelist',
        action: 'remove',
        changed: true,
        idempotencyKey: 'idem-1',
        requestedBy: 'alice',
        createdAt: new Date('2026-01-02T03:04:05.000Z'),
      },
    ]);

    const response = await controller.listCompliancePolicyMutationHistory({
      limit: 25,
    });

    expect(listHistoryUseCase.execute).toHaveBeenCalledWith({
      limit: 25,
    });
    expect(response).toEqual({
      records: [
        {
          address: '0xabc',
          network: 'eip155:1',
          policy: CompliancePolicy.COMPLIANCE_POLICY_WHITELIST,
          action: CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_REMOVE,
          changed: true,
          idempotencyKey: 'idem-1',
          createdAt: '2026-01-02T03:04:05.000Z',
        },
      ],
    });
  });

  it('maps secure policy mutations to grpc response', async () => {
    secureMutateUseCase.execute.mockResolvedValue({
      address: '0xabc',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      changed: true,
      idempotencyKey: 'idem-2',
      replayed: false,
    });

    const response = await controller.secureMutateCompliancePolicy({
      address: '0xabc',
      network: 'eip155:1',
      policy: CompliancePolicy.COMPLIANCE_POLICY_BLACKLIST,
      action: CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_ADD,
      confirmPolicySwitch: true,
      idempotencyKey: 'idem-2',
      timestamp: '1700000000',
      signature:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      requestedBy: 'service-a',
    });

    expect(secureMutateUseCase.execute).toHaveBeenCalledWith({
      address: '0xabc',
      network: 'eip155:1',
      policy: 'blacklist',
      action: 'add',
      confirmPolicySwitch: true,
      idempotencyKey: 'idem-2',
      timestamp: '1700000000',
      signature:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      requestedBy: 'service-a',
    });
    expect(response).toEqual({
      address: '0xabc',
      network: 'eip155:1',
      policy: CompliancePolicy.COMPLIANCE_POLICY_BLACKLIST,
      action: CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_ADD,
      changed: true,
      idempotencyKey: 'idem-2',
      replayed: false,
    });
  });

  it('maps trusted policy mutations to grpc response', async () => {
    trustedMutateUseCase.execute.mockResolvedValue({
      address: '0xabc',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'remove',
      changed: false,
      idempotencyKey: 'idem-3',
      replayed: true,
    });

    const response = await controller.trustedMutateCompliancePolicy({
      address: '0xabc',
      network: 'eip155:1',
      policy: CompliancePolicy.COMPLIANCE_POLICY_WHITELIST,
      action: CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_REMOVE,
      confirmPolicySwitch: false,
      idempotencyKey: 'idem-3',
      requestedBy: 'alice',
      timestamp: '1700000000',
      signature:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    expect(trustedMutateUseCase.execute).toHaveBeenCalledWith({
      address: '0xabc',
      network: 'eip155:1',
      policy: 'whitelist',
      action: 'remove',
      confirmPolicySwitch: false,
      idempotencyKey: 'idem-3',
      requestedBy: 'alice',
      timestamp: '1700000000',
      signature:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });
    expect(response).toEqual({
      address: '0xabc',
      network: 'eip155:1',
      policy: CompliancePolicy.COMPLIANCE_POLICY_WHITELIST,
      action: CompliancePolicyAction.COMPLIANCE_POLICY_ACTION_REMOVE,
      changed: false,
      idempotencyKey: 'idem-3',
      replayed: true,
    });
  });
});
