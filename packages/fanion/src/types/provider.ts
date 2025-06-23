export type FeatureCheck<T = any> = (context: T) => Promise<boolean> | boolean;
/**
 * A feature provider is a class that can be used to retrieve feature flags.
 */
export interface FeatureManagerProvider {
  /**
   * Define a feature flag.
   *
   * @param flagName The name of the feature flag.
   * @param check A callback function that returns a boolean indicating whether the feature flag is enabled or not.
   * @returns void
   *
   * @example
   * ```ts
   * Feature.define("my-feature-flag", () => true);
   * ```
   */
  define<T>(flagName: string, check: FeatureCheck<T>): void;

  /**
   * Check if a feature flag is enabled for a given context
   * If no context is provided, the feature flag will be checked for the global context or in the
   * storage provider if one is defined.
   *
   * @param flagName The name of the feature flag.
   * @param context The context object that will be passed to the feature flag check function.
   * @returns A boolean indicating whether the feature flag is enabled or not.
   *
   * @example
   * ```ts
   * const isEnabled = Feature.check("my-feature-flag", { user: { isAdmin: true } });
   * ```
   */
  active<T>(flagName: string, context?: T): Promise<boolean> | boolean;
}
