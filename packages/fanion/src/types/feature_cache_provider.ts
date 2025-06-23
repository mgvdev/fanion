export interface FeatureCacheProvider {
  /**
   *
   * @param flag
   * @param contextKey
   * @param value
   */
  set(flag: string, contextKey: string, value: boolean): Promise<void>;

  /**
   *
   * @param flag
   */
  get(flag: string, contextKey: string): Promise<boolean>;

  /**
   * Clear all cached feature result
   */
  clear(): Promise<void>;

  /**
   * Delete a cached feature result
   *
   * @param featureName
   * @param contextKey
   */
  delete(featureName: string, contextKey: string): Promise<void>;
}
