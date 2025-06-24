import type { Knex } from "knex";
import { FeatureStorageProvider } from "./feature_storage_provider.js";

/**
 * Provider interface for database adapters
 */
export interface DatabaseStorageProvider extends FeatureStorageProvider {
  createTableIfNotExists(): Promise<void>;
}

export interface DatabaseConfig {
  /**
   * The name of the database to connect to
   */
  tableName?: string;

  /**
   * The name of feature name column
   */
  featureNameColumn?: string;

  /**
   * The name of the feature value column
   */
  valueColumn?: string;
}

/**
 * The configuration for the Knex database driver
 */
export interface KnexConfig extends DatabaseConfig {
  connection: Knex;
}
