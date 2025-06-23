/**
 * Error return when a feature not exist
 */
export class FeatureNotExistsError extends Error {
  constructor(featureName: string) {
    super(`Feature ${featureName} does not exists`);
  }
}

/**
 * Error return when feature manager database provider is not enabled
 */
export class ProviderNotDefined extends Error {
  constructor() {
    super("Database provider not defined");
  }
}
