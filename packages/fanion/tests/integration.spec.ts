import { test } from "@japa/runner";
import {
  featureManager,
  featureManagerWithDatabase,
  createInMemoryDriver,
  createKnexDatabaseDriver,
  createDynamoDBDatabaseDriver,
  DynamoDBDatabaseDriver,
  KnexDatabaseDriver,
  InMemoryDriver,
  FeatureManager,
  generateFeatureName,
} from "../index.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import knex from "knex";

// Mock DynamoDB client for testing
class MockDynamoDBClient {
  private tables = new Map<string, Map<string, any>>();

  async send(command: any): Promise<any> {
    const commandName = command.constructor.name;

    switch (commandName) {
      case "CreateTableCommand":
        const tableName = command.input.TableName;
        this.tables.set(tableName, new Map());
        return Promise.resolve({});
      case "DescribeTableCommand":
        const describeTableName = command.input.TableName;
        if (!this.tables.has(describeTableName)) {
          const error = new Error("Table not found");
          (error as any).name = "ResourceNotFoundException";
          throw error;
        }
        return Promise.resolve({
          Table: { TableStatus: "ACTIVE" },
        });
      case "PutItemCommand":
        const putTableName = command.input.TableName;
        const item = command.input.Item;
        if (!this.tables.has(putTableName)) {
          throw new Error("Table not found");
        }
        const table = this.tables.get(putTableName)!;
        const key = Object.values(item)[0] as any;
        table.set(key.S, item);
        return Promise.resolve({});
      case "GetItemCommand":
        const getTableName = command.input.TableName;
        const getKey = command.input.Key;
        if (!this.tables.has(getTableName)) {
          throw new Error("Table not found");
        }
        const getTable = this.tables.get(getTableName)!;
        const keyValue = Object.values(getKey)[0] as any;
        const foundItem = getTable.get(keyValue.S);
        return Promise.resolve({ Item: foundItem });
      case "DeleteItemCommand":
        const deleteTableName = command.input.TableName;
        const deleteKey = command.input.Key;
        if (!this.tables.has(deleteTableName)) {
          throw new Error("Table not found");
        }
        const deleteTable = this.tables.get(deleteTableName)!;
        const deleteKeyValue = Object.values(deleteKey)[0] as any;
        deleteTable.delete(deleteKeyValue.S);
        return Promise.resolve({});
      default:
        throw new Error(`Unsupported command: ${commandName}`);
    }
  }
}

test.group("Integration Tests", () => {
  test("Should export all necessary classes and functions", async ({ expect }) => {
    // Test basic exports
    expect(typeof featureManager).toBe("function");
    expect(typeof featureManagerWithDatabase).toBe("function");
    expect(typeof generateFeatureName).toBe("function");

    // Test driver factory functions
    expect(typeof createInMemoryDriver).toBe("function");
    expect(typeof createKnexDatabaseDriver).toBe("function");
    expect(typeof createDynamoDBDatabaseDriver).toBe("function");

    // Test driver classes
    expect(typeof DynamoDBDatabaseDriver).toBe("function");
    expect(typeof KnexDatabaseDriver).toBe("function");
    expect(typeof InMemoryDriver).toBe("function");
    expect(typeof FeatureManager).toBe("function");
  });

  test("Should create DynamoDB driver instance", async ({ expect }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const driver = createDynamoDBDatabaseDriver({
      client: mockClient,
      tableName: "test_table",
    });

    expect(driver).toBeInstanceOf(DynamoDBDatabaseDriver);
    expect(driver.isDatabaseDriver()).toBe(true);
  });

  test("Should create feature manager with DynamoDB driver", async ({ expect }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const driver = createDynamoDBDatabaseDriver({
      client: mockClient,
    });

    const features = await featureManagerWithDatabase({
      store: driver,
    });

    expect(features).toBeInstanceOf(FeatureManager);

    // Test basic functionality
    await features.defineAndStore("test_flag", true);
    const isActive = await features.active("test_flag");
    expect(isActive).toBe(true);
  });

  test("Should work with both SQL and DynamoDB drivers", async ({ expect }) => {
    // Test SQL driver
    const db = knex({
      client: "sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
    });

    const sqlDriver = createKnexDatabaseDriver({
      connection: db,
    });

    const sqlFeatures = await featureManagerWithDatabase({
      store: sqlDriver,
    });

    await sqlFeatures.defineAndStore("sql_flag", true);
    const sqlActive = await sqlFeatures.active("sql_flag");
    expect(sqlActive).toBe(true);

    // Test DynamoDB driver
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const dynamoDriver = createDynamoDBDatabaseDriver({
      client: mockClient,
    });

    const dynamoFeatures = await featureManagerWithDatabase({
      store: dynamoDriver,
    });

    await dynamoFeatures.defineAndStore("dynamo_flag", true);
    const dynamoActive = await dynamoFeatures.active("dynamo_flag");
    expect(dynamoActive).toBe(true);

    // Cleanup
    await db.destroy();
  });

  test("Should handle context-based features with DynamoDB", async ({ expect }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const driver = createDynamoDBDatabaseDriver({
      client: mockClient,
    });

    const features = await featureManagerWithDatabase({
      store: driver,
    });

    // Define a context-based feature
    features.define("premium_feature", (context: { user: { plan: string } }) => {
      return context.user.plan === "premium";
    });

    // Test with different contexts
    const premiumUser = await features.active("premium_feature", {
      user: { plan: "premium" },
    });
    expect(premiumUser).toBe(true);

    const freeUser = await features.active("premium_feature", {
      user: { plan: "free" },
    });
    expect(freeUser).toBe(false);
  });

  test("Should generate feature names correctly", async ({ expect }) => {
    const simpleName = generateFeatureName("auth", "oauth");
    expect(simpleName).toBe("auth:oauth");

    const complexName = generateFeatureName("auth", "oauth", "google");
    expect(complexName).toBe("auth:oauth.google");
  });
});
