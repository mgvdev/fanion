import { FeatureStorageProvider } from "../types/feature_storage_provider.js";

export function createInMemoryDriver(): FeatureStorageProvider {
  return new InMemoryDriver();
}

/**
 * In-memory feature storage driver
 */
export class InMemoryDriver implements FeatureStorageProvider {
  #storage = new Map<string, boolean>();

  async set(flag: string, value: boolean): Promise<void> {
    this.#storage.set(flag, value);
  }

  async get(flag: string): Promise<boolean | undefined> {
    return this.#storage.get(flag) ?? undefined;
  }

  async delete(featureName: string): Promise<void> {
    this.#storage.delete(featureName);
  }
}
