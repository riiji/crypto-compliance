export const COMPLIANCE_LOCK_PORT = Symbol('COMPLIANCE_LOCK_PORT');

export interface ComplianceLockPort {
  withAddressLock<T>(
    input: { address: string; network: string },
    action: () => Promise<T>,
  ): Promise<T>;
}
