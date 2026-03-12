export const COMPLIANCE_IDEMPOTENCY_PORT = Symbol(
  'COMPLIANCE_IDEMPOTENCY_PORT',
);

export interface IdempotencyExecutionResult<T> {
  result: T;
  replayed: boolean;
}

export interface ComplianceIdempotencyPort {
  executeOnce<T>(input: {
    key: string;
    requestHash: string;
    action: () => Promise<T>;
  }): Promise<IdempotencyExecutionResult<T>>;
}
