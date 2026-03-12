import { Controller, Inject, Logger } from '@nestjs/common';
import {
  CHECK_ADDRESS_COMPLIANCE_USE_CASE,
  type CheckAddressComplianceUseCase,
} from '../../../application/ports/inbound/check-address-compliance.use-case';
import type {
  ComplianceAssessmentSource as DomainComplianceAssessmentSource,
  ComplianceCheckStatus as DomainComplianceCheckStatus,
  ComplianceRetrievalSource as DomainComplianceRetrievalSource,
  ComplianceSignal as DomainComplianceSignal,
} from '../../../domain/compliance-check-result.entity';
import {
  ComplianceAssessmentSource,
  ComplianceCheckStatus,
  ComplianceRetrievalSource,
  type CheckAddressComplianceRequest,
  type CheckAddressComplianceResponse,
  type ComplianceServiceController,
  ComplianceServiceControllerMethods,
} from '../../../compliance';

@Controller()
@ComplianceServiceControllerMethods()
export class ComplianceController implements ComplianceServiceController {
  private readonly logger = new Logger(ComplianceController.name);

  constructor(
    @Inject(CHECK_ADDRESS_COMPLIANCE_USE_CASE)
    private readonly checkAddressComplianceUseCase: CheckAddressComplianceUseCase,
  ) {}

  async checkAddressCompliance(
    request: CheckAddressComplianceRequest,
  ): Promise<CheckAddressComplianceResponse> {
    const maskedAddress = this.maskAddress(request.address);
    this.logger.log(
      `gRPC CheckAddressCompliance requested address=${maskedAddress} network=${request.network}`,
    );

    try {
      const result = await this.checkAddressComplianceUseCase.execute({
        address: request.address,
        network: request.network,
      });

      const response: CheckAddressComplianceResponse = {
        address: result.address,
        network: result.network,
        status: this.mapStatus(result.status),
        riskScore: result.riskScore ?? undefined,
        signals: this.mapSignals(result.signals),
        checkedAt: result.checkedAt?.toISOString(),
        assessmentSource: this.mapAssessmentSource(result.assessmentSource),
        retrievalSource: this.mapRetrievalSource(result.retrievalSource),
        isHighRisk: result.isHighRisk,
      };

      this.logger.log(
        `gRPC CheckAddressCompliance completed address=${maskedAddress} status=${result.status} retrievalSource=${result.retrievalSource} isHighRisk=${result.isHighRisk}`,
      );

      return response;
    } catch (error) {
      this.logger.warn(
        `gRPC CheckAddressCompliance failed address=${maskedAddress} network=${request.network} error=${this.toErrorMessage(error)}`,
      );
      throw error;
    }
  }

  private mapStatus(
    status: DomainComplianceCheckStatus,
  ): ComplianceCheckStatus {
    switch (status) {
      case 'ready':
        return ComplianceCheckStatus.COMPLIANCE_CHECK_STATUS_READY;
      case 'in_progress':
        return ComplianceCheckStatus.COMPLIANCE_CHECK_STATUS_IN_PROGRESS;
    }
  }

  private mapAssessmentSource(
    source: DomainComplianceAssessmentSource,
  ): ComplianceAssessmentSource {
    switch (source) {
      case 'provider':
        return ComplianceAssessmentSource.COMPLIANCE_ASSESSMENT_SOURCE_PROVIDER;
      case 'blacklist':
        return ComplianceAssessmentSource.COMPLIANCE_ASSESSMENT_SOURCE_BLACKLIST;
      case 'whitelist':
        return ComplianceAssessmentSource.COMPLIANCE_ASSESSMENT_SOURCE_WHITELIST;
    }
  }

  private mapRetrievalSource(
    source: DomainComplianceRetrievalSource,
  ): ComplianceRetrievalSource {
    switch (source) {
      case 'provider':
        return ComplianceRetrievalSource.COMPLIANCE_RETRIEVAL_SOURCE_PROVIDER;
      case 'cache':
        return ComplianceRetrievalSource.COMPLIANCE_RETRIEVAL_SOURCE_CACHE;
      case 'policy':
        return ComplianceRetrievalSource.COMPLIANCE_RETRIEVAL_SOURCE_POLICY;
    }
  }

  private mapSignals(
    signals: DomainComplianceSignal[] | null,
  ): CheckAddressComplianceResponse['signals'] {
    if (!signals) {
      return [];
    }

    return signals.map((signal) => ({
      category: signal.category,
      score: signal.score,
    }));
  }

  private maskAddress(address: string): string {
    const trimmed = address.trim();
    if (trimmed.length <= 10) {
      return trimmed;
    }

    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
