import type { Knex } from "knex";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
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

/**
 * The configuration for the DynamoDB database driver
 */
export interface DynamoDBConfig {
  /**
   * DynamoDB client instance
   */
  client: DynamoDBClient;

  /**
   * The name of the DynamoDB table (defaults to 'feature_flags')
   */
  tableName?: string;

  /**
   * The name of the feature name attribute (defaults to 'feature_name')
   */
  featureNameAttribute?: string;

  /**
   * The name of the feature value attribute (defaults to 'value')
   */
  valueAttribute?: string;
}
