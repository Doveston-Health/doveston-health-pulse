export class ClinikoError extends Error {
  constructor(message = 'Cliniko is temporarily unavailable.', {code = 'CLINIKO_ERROR', statusCode = 502} = {}) {
    super(message);
    this.name = 'ClinikoError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class ClinikoNotConfiguredError extends ClinikoError {
  constructor() {
    super('Cliniko is not configured.', {code: 'CLINIKO_NOT_CONFIGURED', statusCode: 503});
  }
}

export class ClinikoSyncConflictError extends ClinikoError {
  constructor() {
    super('A Cliniko sync is already in progress.', {code: 'CLINIKO_SYNC_CONFLICT', statusCode: 409});
  }
}

export function sanitiseClinikoError(error) {
  if (error instanceof ClinikoError) return error.message;
  return 'Cliniko is temporarily unavailable.';
}
