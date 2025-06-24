/**
 * Feature database provider
 * Used to store feature flag into a storage
 */
export interface FeatureStorageProvider {
  /**
   *
   * @param flag
   * @param contextKey
   * @param value
   */
  set(flag: string, value: boolean): Promise<void>;

  /**
   *
   * @param flag
   */
  get(flag: string): Promise<boolean | undefined>;

  /**
   * Delete a cached feature result
   *
   * @param featureName
   */
  delete(featureName: string): Promise<void>;

  /**
   * Check if the provider is a database driver
   */
  isDatabaseDriver(): boolean;

  /**
   * Initialise a provider
   */
  initStore(): Promise<void>;
}
