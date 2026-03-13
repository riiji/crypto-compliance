import { Injectable } from '@nestjs/common';
import { SentryTraced } from '@sentry/nestjs';
import {
  COMPLIANCE_PROVIDER_PORT,
  type ComplianceProviderPort,
} from '../../../application/ports/outbound/compliance-provider.port';
import type {
  ComplianceCheckResult,
  ComplianceCheckStatus,
  ComplianceProviderResponsePayload,
  ComplianceSignal,
} from '../../../domain/compliance-check-result.entity';
import { isHighRiskFromProvider } from '../../../domain/risk-evaluation';
import {
  ComplianceProviderConfigurationError,
  ComplianceProviderRequestError,
  ComplianceProviderResponseFormatError,
  ComplianceProviderValidationError,
} from '../../../domain/errors/compliance-provider.error';
import { z } from 'zod';

interface SuwardSignalResponse {
  category: string;
  score: number;
}

interface SuwardComplianceResponse {
  address: string;
  network: string;
  status: ComplianceCheckStatus;
  risk_score: number | null;
  signals: SuwardSignalResponse[] | null;
  checked_at: string | null;
}

const CAIP2_NETWORK_PATTERN = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/;
const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

const complianceCheckInputSchema = z
  .object({
    address: z.string().trim().min(1, 'Address must not be empty'),
    network: z
      .string()
      .trim()
      .min(1, 'Network must not be empty')
      .regex(
        CAIP2_NETWORK_PATTERN,
        'Network must be a valid CAIP-2 chain id (example: eip155:1)',
      ),
  })
  .superRefine((value, ctx) => {
    const [namespace, reference = ''] = value.network.split(':', 2);
    if (namespace !== 'eip155') {
      return;
    }

    if (!/^[1-9][0-9]*$/.test(reference)) {
      ctx.addIssue({
        code: 'custom',
        message: 'eip155 reference must be a positive chain id',
        path: ['network'],
      });
    }

    if (!EVM_ADDRESS_PATTERN.test(value.address)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Address must be a valid EVM address (0x + 40 hex chars)',
        path: ['address'],
      });
    }
  });

const suwardSignalResponseSchema = z.object({
  category: z.string(),
  score: z.number(),
});

const suwardComplianceResponseSchema = z.object({
  address: z.string(),
  network: z.string(),
  status: z.enum(['ready', 'in_progress']),
  risk_score: z.number().nullable(),
  signals: z.array(suwardSignalResponseSchema).nullable(),
  checked_at: z.string().nullable(),
});

@Injectable()
export class SuwardComplianceProviderAdapter implements ComplianceProviderPort {
  private readonly endpoint = process.env.COMPLIANCE_API_URL?.trim();

  private readonly apiKey = process.env.COMPLIANCE_API_KEY;

  @SentryTraced('compliance.provider.suward.check-address')
  async checkAddress(input: {
    address: string;
    network: string;
  }): Promise<ComplianceCheckResult> {
    const normalizedInput = this.validateAndNormalizeInput(input);

    if (!this.apiKey) {
      throw new ComplianceProviderConfigurationError(
        'COMPLIANCE_API_KEY is not configured',
      );
    }

    if (!this.endpoint) {
      throw new ComplianceProviderConfigurationError(
        'COMPLIANCE_API_URL is not configured',
      );
    }

    const { response, rawPayload } =
      await this.requestComplianceCheck(normalizedInput);
    return this.toDomain(response, rawPayload);
  }

  private async requestComplianceCheck(input: {
    address: string;
    network: string;
  }): Promise<{
    response: SuwardComplianceResponse;
    rawPayload: ComplianceProviderResponsePayload;
  }> {
    let response: Response;
    try {
      response = await fetch(this.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey!,
        },
        body: JSON.stringify({
          address: input.address,
          network: input.network,
        }),
      });
    } catch (error: unknown) {
      throw new ComplianceProviderRequestError(
        `Request to compliance provider failed: ${this.toErrorMessage(error)}`,
      );
    }

    const responseText = await response.text();
    if (!response.ok) {
      throw new ComplianceProviderRequestError(
        `Compliance provider returned status ${response.status}`,
        response.status,
        responseText,
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new ComplianceProviderResponseFormatError(
        'Compliance provider returned non-JSON response',
      );
    }

    return this.parseProviderResponse(payload);
  }

  private parseProviderResponse(payload: unknown): {
    response: SuwardComplianceResponse;
    rawPayload: ComplianceProviderResponsePayload;
  } {
    const parsed = suwardComplianceResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ComplianceProviderResponseFormatError(
        this.toZodIssueMessage(
          parsed.error,
          'Compliance provider response format is invalid',
        ),
      );
    }

    return {
      response: parsed.data,
      rawPayload: this.toRawPayload(payload),
    };
  }

  private toDomain(
    response: SuwardComplianceResponse,
    rawPayload: ComplianceProviderResponsePayload,
  ): ComplianceCheckResult {
    let checkedAt: Date | null = null;
    if (response.checked_at !== null) {
      checkedAt = new Date(response.checked_at);
      if (Number.isNaN(checkedAt.getTime())) {
        throw new ComplianceProviderResponseFormatError(
          'Invalid response field: checked_at is not an ISO date',
        );
      }
    }

    const signals: ComplianceSignal[] | null =
      response.signals?.map((signal) => ({
        category: signal.category,
        score: signal.score,
      })) ?? null;

    return {
      address: response.address,
      network: response.network,
      status: response.status,
      riskScore: response.risk_score,
      signals,
      checkedAt,
      assessmentSource: 'provider',
      retrievalSource: 'provider',
      isHighRisk: isHighRiskFromProvider({
        riskScore: response.risk_score,
        signals,
      }),
      providerResponsePayload: rawPayload,
    };
  }

  private validateAndNormalizeInput(input: {
    address: string;
    network: string;
  }): { address: string; network: string } {
    const parsed = complianceCheckInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new ComplianceProviderValidationError(
        this.toZodIssueMessage(parsed.error, 'Compliance request is invalid'),
      );
    }

    return parsed.data;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown network error';
  }

  private toZodIssueMessage(error: z.ZodError, fallback: string): string {
    const firstIssue = error.issues[0];
    if (!firstIssue) {
      return fallback;
    }

    return firstIssue.message;
  }

  private toRawPayload(payload: unknown): ComplianceProviderResponsePayload {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new ComplianceProviderResponseFormatError(
        'Compliance provider response must be a JSON object',
      );
    }

    return payload as ComplianceProviderResponsePayload;
  }
}

export const SuwardComplianceProviderAdapterProvider = {
  provide: COMPLIANCE_PROVIDER_PORT,
  useExisting: SuwardComplianceProviderAdapter,
};
