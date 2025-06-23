import { FeatureNotExistsError } from "./errors.js";
import type { FeatureCacheProvider } from "./types/feature_cache_provider.js";
import type { FeatureCheck, FeatureProvider } from "./types/provider.js";

export function featureManager(config?: { store: FeatureCacheProvider }) {
  return new FeatureManager(config);
}

/**
 * A feature provider is a class that can be used to retrieve feature flags.
 */
export class FeatureManager implements FeatureProvider {
  /**
   * Map to store feature flag check functions
   */
  protected featureMap = new Map<string, FeatureCheck | undefined>();

  /**
   * The cache provider used to store feature flag results
   */
  #store: FeatureCacheProvider | undefined;

  constructor(config?: { store: FeatureCacheProvider }) {
    this.#store = config?.store;
    this.featureMap = new Map<string, FeatureCheck | undefined>();
  }

  /**
   * Define a feature flag.
   *
   * @param flagName the name of the feature flag
   * @param check a callback function that returns a boolean indicating whether the feature flag is enabled or not
   */
  define<T>(
    flagName: string,
    check?: (context: T) => Promise<boolean> | boolean,
  ): void {
    this.featureMap.set(flagName, check);
  }

  /**
   * Check if a feature flag is enabled for a given context
   *
   * @param flagName The name of the feature flag.
   * @param context The context object that will be passed to the feature flag check function.
   * @throws {FeatureNotExistsError} If the feature flag is not defined.
   *
   * @returns A boolean indicating whether the feature flag is enabled or not.
   */
  async active<T>(flagName: string, context?: T): Promise<boolean> {
    if (!this.featureMap.has(flagName)) {
      throw new FeatureNotExistsError(
        `Feature flag '${flagName}' is not defined`,
      );
    }
    const check = this.featureMap.get(flagName);

    if (check === undefined) {
      return true;
    }

    const result = await check(context);
    return result;
  }
}
