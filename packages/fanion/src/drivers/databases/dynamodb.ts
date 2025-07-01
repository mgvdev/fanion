import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  DatabaseStorageProvider,
  DynamoDBConfig,
} from "../../types/database_drivers_options.js";

export function createDynamoDBDatabaseDriver(
  config: DynamoDBConfig,
): DatabaseStorageProvider {
  return new DynamoDBDatabaseDriver(config);
}

/**
 * A database driver that uses DynamoDB to store feature flags.
 */
export class DynamoDBDatabaseDriver implements DatabaseStorageProvider {
  #tableName: string;
  #featureNameAttribute: string;
  #valueAttribute: string;
  #client: DynamoDBClient;

  constructor(config: DynamoDBConfig) {
    this.#tableName = config.tableName ?? "feature_flags";
    this.#featureNameAttribute = config.featureNameAttribute ?? "feature_name";
    this.#valueAttribute = config.valueAttribute ?? "value";
    this.#client = config.client;
  }

  /**
   * Set the value of a feature flag in DynamoDB.
   * Upserts the item if the feature flag doesn't exist.
   *
   * @param flag The feature flag name
   * @param value The feature flag value
   */
  async set(flag: string, value: boolean): Promise<void> {
    const item = {
      [this.#featureNameAttribute]: flag,
      [this.#valueAttribute]: value,
    };

    const command = new PutItemCommand({
      TableName: this.#tableName,
      Item: marshall(item),
    });

    await this.#client.send(command);
  }

  /**
   * Get the value of a feature flag from DynamoDB.
   *
   * @param flag The feature flag name
   * @returns The feature flag value or undefined if not found
   */
  async get(flag: string): Promise<boolean | undefined> {
    const command = new GetItemCommand({
      TableName: this.#tableName,
      Key: marshall({
        [this.#featureNameAttribute]: flag,
      }),
    });

    try {
      const response = await this.#client.send(command);

      if (!response.Item) {
        return undefined;
      }

      const item = unmarshall(response.Item);
      return item[this.#valueAttribute] as boolean;
    } catch (error) {
      // If the table doesn't exist or other errors, return undefined
      return undefined;
    }
  }

  /**
   * Delete a feature flag from DynamoDB.
   *
   * @param featureName The feature flag name to delete
   */
  async delete(featureName: string): Promise<void> {
    const command = new DeleteItemCommand({
      TableName: this.#tableName,
      Key: marshall({
        [this.#featureNameAttribute]: featureName,
      }),
    });

    await this.#client.send(command);
  }

  /**
   * Create the DynamoDB table if it doesn't exist.
   */
  async createTableIfNotExists(): Promise<void> {
    try {
      // Check if table exists
      const describeCommand = new DescribeTableCommand({
        TableName: this.#tableName,
      });

      await this.#client.send(describeCommand);
      // Table exists, nothing to do
      return;
    } catch (error: any) {
      // Table doesn't exist, create it
      if (error.name === "ResourceNotFoundException") {
        const createCommand = new CreateTableCommand({
          TableName: this.#tableName,
          KeySchema: [
            {
              AttributeName: this.#featureNameAttribute,
              KeyType: "HASH", // Partition key
            },
          ],
          AttributeDefinitions: [
            {
              AttributeName: this.#featureNameAttribute,
              AttributeType: "S", // String
            },
          ],
          BillingMode: "PAY_PER_REQUEST", // On-demand billing
        });

        await this.#client.send(createCommand);

        // Wait for table to be active
        await this.#waitForTableActive();
      } else {
        throw error;
      }
    }
  }

  /**
   * Wait for the table to become active after creation.
   */
  async #waitForTableActive(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const describeCommand = new DescribeTableCommand({
          TableName: this.#tableName,
        });

        const response = await this.#client.send(describeCommand);

        if (response.Table?.TableStatus === "ACTIVE") {
          return;
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error) {
        // Continue waiting
      }
    }

    throw new Error(`Table ${this.#tableName} did not become active within expected time`);
  }

  /**
   * Check if this is a database driver.
   */
  isDatabaseDriver(): boolean {
    return true;
  }

  /**
   * Initialize the storage provider by creating the table if needed.
   */
  async initStore(): Promise<void> {
    await this.createTableIfNotExists();
  }
}
