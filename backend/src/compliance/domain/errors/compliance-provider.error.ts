export class ComplianceProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComplianceProviderError';
  }
}

export class ComplianceProviderConfigurationError extends ComplianceProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'ComplianceProviderConfigurationError';
  }
}

export class ComplianceProviderRequestError extends ComplianceProviderError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = 'ComplianceProviderRequestError';
  }
}

export class ComplianceProviderResponseFormatError extends ComplianceProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'ComplianceProviderResponseFormatError';
  }
}

export class ComplianceProviderValidationError extends ComplianceProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'ComplianceProviderValidationError';
  }
}
