/**
 * Error return when a feature not exist
 */
export class FeatureNotExistsError extends Error {
  constructor(featureName: string) {
    super(`Feature ${featureName} does not exists`);
  }
}
