import { test } from "@japa/runner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { createDynamoDBDatabaseDriver } from "../../../src/drivers/databases/dynamodb.js";
import { featureManagerWithDatabase } from "../../../src/feature.js";

// Mock DynamoDB client for testing
class MockDynamoDBClient {
  private tables = new Map<string, Map<string, any>>();
  private tableStatus = new Map<string, string>();

  async send(command: any): Promise<any> {
    const commandName = command.constructor.name;

    switch (commandName) {
      case "CreateTableCommand":
        return this.handleCreateTable(command);
      case "DescribeTableCommand":
        return this.handleDescribeTable(command);
      case "PutItemCommand":
        return this.handlePutItem(command);
      case "GetItemCommand":
        return this.handleGetItem(command);
      case "DeleteItemCommand":
        return this.handleDeleteItem(command);
      default:
        throw new Error(`Unsupported command: ${commandName}`);
    }
  }

  private handleCreateTable(command: any) {
    const tableName = command.input.TableName;
    this.tables.set(tableName, new Map());
    this.tableStatus.set(tableName, "ACTIVE");
    return Promise.resolve({});
  }

  private handleDescribeTable(command: any) {
    const tableName = command.input.TableName;
    if (!this.tables.has(tableName)) {
      const error = new Error("Table not found");
      (error as any).name = "ResourceNotFoundException";
      throw error;
    }
    return Promise.resolve({
      Table: {
        TableStatus: this.tableStatus.get(tableName) || "ACTIVE",
      },
    });
  }

  private handlePutItem(command: any) {
    const tableName = command.input.TableName;
    const item = command.input.Item;

    if (!this.tables.has(tableName)) {
      throw new Error("Table not found");
    }

    const table = this.tables.get(tableName)!;
    const key = Object.values(item)[0] as any; // Get the first attribute value as key
    table.set(key.S, item);

    return Promise.resolve({});
  }

  private handleGetItem(command: any) {
    const tableName = command.input.TableName;
    const key = command.input.Key;

    if (!this.tables.has(tableName)) {
      throw new Error("Table not found");
    }

    const table = this.tables.get(tableName)!;
    const keyValue = Object.values(key)[0] as any; // Get the first key value
    const item = table.get(keyValue.S);

    return Promise.resolve({
      Item: item,
    });
  }

  private handleDeleteItem(command: any) {
    const tableName = command.input.TableName;
    const key = command.input.Key;

    if (!this.tables.has(tableName)) {
      throw new Error("Table not found");
    }

    const table = this.tables.get(tableName)!;
    const keyValue = Object.values(key)[0] as any; // Get the first key value
    table.delete(keyValue.S);

    return Promise.resolve({});
  }

  // Helper method to check if table exists (for testing)
  hasTable(tableName: string): boolean {
    return this.tables.has(tableName);
  }

  // Helper method to get table data (for testing)
  getTableData(tableName: string): Map<string, any> | undefined {
    return this.tables.get(tableName);
  }
}

test.group("DynamoDB Driver", () => {
  test("Should create table if it doesn't exist when DynamoDB driver is used", async ({
    expect,
  }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const dynamoDriver = createDynamoDBDatabaseDriver({
      client: mockClient,
      tableName: "test_features",
      featureNameAttribute: "feature_name",
      valueAttribute: "is_active",
    });

    await featureManagerWithDatabase({
      store: dynamoDriver,
    });

    expect((mockClient as any).hasTable("test_features")).toBe(true);
  });

  test("Feature manager should return a feature from DynamoDB", async ({
    expect,
  }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const dynamoDriver = createDynamoDBDatabaseDriver({
      client: mockClient,
      tableName: "test_features",
      featureNameAttribute: "feature_name",
      valueAttribute: "is_active",
    });

    const featureManager = await featureManagerWithDatabase({
      store: dynamoDriver,
    });

    // Manually insert a feature into the mock database
    await dynamoDriver.set("test_feature", true);

    const feature = await featureManager.active("test_feature");

    expect(feature).toBe(true);
  });

  test("Should store a feature in DynamoDB via the feature manager", async ({
    expect,
  }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const dynamoDriver = createDynamoDBDatabaseDriver({
      client: mockClient,
      tableName: "test_features",
      featureNameAttribute: "feature_name",
      valueAttribute: "is_active",
    });

    const featureManager = await featureManagerWithDatabase({
      store: dynamoDriver,
    });

    await featureManager.defineAndStore("new_feature", true);

    const feature = await featureManager.active("new_feature");

    expect(feature).toBe(true);
  });

  test("Should handle feature not found gracefully", async ({ expect }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const dynamoDriver = createDynamoDBDatabaseDriver({
      client: mockClient,
      tableName: "test_features",
    });

    await featureManagerWithDatabase({
      store: dynamoDriver,
    });

    const result = await dynamoDriver.get("non_existent_feature");

    expect(result).toBeUndefined();
  });

  test("Should delete a feature from DynamoDB", async ({ expect }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const dynamoDriver = createDynamoDBDatabaseDriver({
      client: mockClient,
      tableName: "test_features",
    });

    await featureManagerWithDatabase({
      store: dynamoDriver,
    });

    // Set a feature
    await dynamoDriver.set("temp_feature", true);
    expect(await dynamoDriver.get("temp_feature")).toBe(true);

    // Delete the feature
    await dynamoDriver.delete("temp_feature");
    expect(await dynamoDriver.get("temp_feature")).toBeUndefined();
  });

  test("Should use default configuration values", async ({ expect }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const dynamoDriver = createDynamoDBDatabaseDriver({
      client: mockClient,
    });

    const featureManager = await featureManagerWithDatabase({
      store: dynamoDriver,
    });

    // Should create table with default name
    expect((mockClient as any).hasTable("feature_flags")).toBe(true);

    await featureManager.defineAndStore("default_test", true);
    const feature = await featureManager.active("default_test");
    expect(feature).toBe(true);
  });

  test("Should correctly identify as database driver", async ({ expect }) => {
    const mockClient = new MockDynamoDBClient() as unknown as DynamoDBClient;

    const dynamoDriver = createDynamoDBDatabaseDriver({
      client: mockClient,
    });

    expect(dynamoDriver.isDatabaseDriver()).toBe(true);
  });
});
