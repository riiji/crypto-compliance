import { Inject, Injectable } from '@nestjs/common';
import { SentryTraced } from '@sentry/nestjs';
import {
  CHECK_ADDRESS_COMPLIANCE_USE_CASE,
  type CheckAddressComplianceUseCase,
} from '../ports/inbound/check-address-compliance.use-case';
import {
  COMPLIANCE_ADDRESS_POLICY_PORT,
  type ComplianceAddressPolicy,
  type ComplianceAddressPolicyPort,
} from '../ports/outbound/compliance-address-policy.port';
import {
  COMPLIANCE_CACHE_PORT,
  type ComplianceCachePort,
} from '../ports/outbound/compliance-cache.port';
import {
  COMPLIANCE_HISTORY_PORT,
  type ComplianceHistoryPort,
} from '../ports/outbound/compliance-history.port';
import {
  COMPLIANCE_LOCK_PORT,
  type ComplianceLockPort,
} from '../ports/outbound/compliance-lock.port';
import {
  COMPLIANCE_PROVIDER_PORT,
  type ComplianceProviderPort,
} from '../ports/outbound/compliance-provider.port';
import type { ComplianceCheckResult } from '../../domain/compliance-check-result.entity';

@Injectable()
export class CheckAddressComplianceService implements CheckAddressComplianceUseCase {
  private readonly cacheTtlSeconds = Number.parseInt(
    process.env.COMPLIANCE_CACHE_TTL_SECONDS ?? '3600',
    10,
  );

  constructor(
    @Inject(COMPLIANCE_ADDRESS_POLICY_PORT)
    private readonly complianceAddressPolicy: ComplianceAddressPolicyPort,
    @Inject(COMPLIANCE_CACHE_PORT)
    private readonly complianceCache: ComplianceCachePort,
    @Inject(COMPLIANCE_HISTORY_PORT)
    private readonly complianceHistory: ComplianceHistoryPort,
    @Inject(COMPLIANCE_LOCK_PORT)
    private readonly complianceLock: ComplianceLockPort,
    @Inject(COMPLIANCE_PROVIDER_PORT)
    private readonly complianceProvider: ComplianceProviderPort,
  ) {}

  @SentryTraced('compliance.check-address.execute')
  async execute(input: {
    address: string;
    network: string;
  }): Promise<ComplianceCheckResult> {
    const normalizedInput = this.normalizeInput(input);

    const policy =
      await this.complianceAddressPolicy.getPolicy(normalizedInput);
    if (policy) {
      return this.saveHistoryAndReturn(
        this.createPolicyDecisionResult(normalizedInput, policy),
      );
    }

    const cached = await this.complianceCache.get(normalizedInput);
    if (cached) {
      return this.saveHistoryAndReturn(
        this.withRetrievalSource(cached, 'cache'),
      );
    }

    const result = await this.complianceLock.withAddressLock(
      normalizedInput,
      async (): Promise<ComplianceCheckResult> => {
        const cachedInsideLock =
          await this.complianceCache.get(normalizedInput);
        if (cachedInsideLock) {
          return this.withRetrievalSource(cachedInsideLock, 'cache');
        }

        const fresh =
          await this.complianceProvider.checkAddress(normalizedInput);
        await this.complianceCache.set(
          normalizedInput,
          fresh,
          this.getCacheTtlSeconds(),
        );

        return fresh;
      },
    );

    return this.saveHistoryAndReturn(result);
  }

  private normalizeInput(input: { address: string; network: string }): {
    address: string;
    network: string;
  } {
    const address = input.address.trim();
    const network = input.network.trim();
    const [namespace] = network.split(':', 2);

    return {
      address: namespace === 'eip155' ? address.toLowerCase() : address,
      network,
    };
  }

  private getCacheTtlSeconds(): number {
    if (Number.isInteger(this.cacheTtlSeconds) && this.cacheTtlSeconds > 0) {
      return this.cacheTtlSeconds;
    }

    return 3600;
  }

  private createPolicyDecisionResult(
    input: { address: string; network: string },
    policy: ComplianceAddressPolicy,
  ): ComplianceCheckResult {
    const isHighRisk = policy === 'blacklist';

    return {
      address: input.address,
      network: input.network,
      status: 'ready',
      riskScore: isHighRisk ? 1 : 0,
      signals: [
        {
          category: policy,
          score: isHighRisk ? 1 : 0,
        },
      ],
      checkedAt: new Date(),
      assessmentSource: policy,
      retrievalSource: 'policy',
      isHighRisk,
      providerResponsePayload: null,
    };
  }

  private withRetrievalSource(
    result: ComplianceCheckResult,
    retrievalSource: ComplianceCheckResult['retrievalSource'],
  ): ComplianceCheckResult {
    return {
      ...result,
      retrievalSource,
    };
  }

  private async saveHistoryAndReturn(
    result: ComplianceCheckResult,
  ): Promise<ComplianceCheckResult> {
    await this.complianceHistory.append(result);
    return result;
  }
}

export const CheckAddressComplianceProvider = {
  provide: CHECK_ADDRESS_COMPLIANCE_USE_CASE,
  useExisting: CheckAddressComplianceService,
};
