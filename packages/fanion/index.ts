export {
  featureManager,
  FeatureManager,
  featureManagerWithDatabase,
} from "./src/feature.js";
export { generateFeatureName } from "./src/utils.js";
export { createInMemoryDriver, InMemoryDriver } from "./src/drivers/memory.js";
export {
  KnexDatabaseDriver,
  createKnexDatabaseDriver,
} from "./src/drivers/databases/knex.js";
export {
  DynamoDBDatabaseDriver,
  createDynamoDBDatabaseDriver,
} from "./src/drivers/databases/dynamodb.js";

export type {
  FeatureManagerProvider,
  FeatureCheck,
} from "./src/types/provider.js";

export type { FeatureStorageProvider } from "./src/types/feature_storage_provider.js";

export type {
  DatabaseConfig,
  DatabaseStorageProvider,
  KnexConfig,
  DynamoDBConfig,
} from "./src/types/database_drivers_options.js";
