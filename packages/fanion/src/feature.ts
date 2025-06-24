import { FeatureNotExistsError } from "./errors.js";
import type { FeatureStorageProvider } from "./types/feature_storage_provider.js";
import type { FeatureCheck, FeatureManagerProvider } from "./types/provider.js";

export function featureManager(config?: { store: FeatureStorageProvider }) {
  return new FeatureManager(config);
}

export async function featureManagerWithDatabase(config: {
  store: FeatureStorageProvider;
}) {
  return await FeatureManager.initWithDatabase(config);
}

/**
 * A feature provider is a class that can be used to retrieve feature flags.
 */
export class FeatureManager implements FeatureManagerProvider {
  /**
   * Map to store feature flag check functions
   */
  protected featureMap = new Map<string, FeatureCheck | undefined>();

  /**
   * The cache provider used to store feature flag results
   */
  protected store: FeatureStorageProvider | undefined;

  constructor(config?: { store: FeatureStorageProvider }) {
    this.store = config?.store;
    this.featureMap = new Map<string, FeatureCheck | undefined>();
  }

  /**
   * Initialize a feature manager with a database provider.
   *
   * @param config The configuration object for the feature manager.
   * @param config.store The database provider to use for storing feature flags
   *
   * @returns A new feature manager instance.
   *
   * @example
   * ```ts
   * const featureManager = FeatureManager.initWithDatabase({
   *   store: new RedisFeatureStorageProvider(),
   * });
   * ````
   */
  static async initWithDatabase(config: { store: FeatureStorageProvider }) {
    const featureManager = new FeatureManager(config);
    await featureManager.initStore();
    return featureManager;
  }

  /**
   * If a store need to be initialised (database connexion, redis...)
   * You must launch this method
   *
   * You can use FeatureManager.initWithDatabase() to init a manager and
   * database in same time
   */
  public async initStore() {
    await this.store?.initStore();
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
   * Define a feature flag and store it in the database provider.
   *
   * @param flagName
   * @param defaultValue
   */
  async defineAndStore(flagName: string, defaultValue = true): Promise<void> {
    if (!this.store) {
      throw new Error("No store provider defined");
    }

    await this.store.set(flagName, defaultValue);
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
      if (this.store) {
        const result = await this.store.get(flagName);
        if (result !== undefined) {
          return result;
        }
      }

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
