import { Knex } from "knex";
import {
  DatabaseStorageProvider,
  KnexConfig,
} from "../../types/database_drivers_options.js";

export function createKnexDatabaseDriver(
  config: KnexConfig,
): DatabaseStorageProvider {
  return new KnexDatabaseDriver(config);
}

/**
 * A database driver that uses Knex to connect to a database.
 */
export class KnexDatabaseDriver implements DatabaseStorageProvider {
  #tableName: string;
  #featureNameColumn: string;
  #valueColumn: string;

  #knex: Knex;

  constructor(config: KnexConfig) {
    this.#tableName = config.tableName ?? "feature_flags";
    this.#featureNameColumn = config.featureNameColumn ?? "feature_name";
    this.#valueColumn = config.valueColumn ?? "value";
    this.#knex = config.connection;
  }

  /**
   * Set the value of a feature flag in the database.
   * Upsert the table if the feature flag doesn't exist.
   *
   * @param flag
   * @param value
   */
  async set(flag: string, value: boolean): Promise<void> {
    await this.#knex
      .table(this.#tableName)
      .insert({
        [this.#featureNameColumn]: flag,
        [this.#valueColumn]: value,
      })
      .onConflict(this.#featureNameColumn)
      .merge({
        [this.#valueColumn]: value,
      });
  }

  /**
   * Get the value of a feature flag from the database.
   *
   * @param flag
   * @returns
   */
  async get(flag: string): Promise<boolean | undefined> {
    const row = await this.#knex
      .table(this.#tableName)
      .where(this.#featureNameColumn, flag)
      .select(this.#valueColumn)
      .first();

    const featureValue = row[this.#valueColumn];

    if (Number.isInteger(featureValue)) {
      return featureValue === 1;
    }

    return featureValue;
  }

  async delete(featureName: string): Promise<void> {
    return this.#knex
      .table(this.#tableName)
      .where(this.#featureNameColumn, featureName)
      .del();
  }

  /**
   * Create the table if it doesn't exist.
   */
  async createTableIfNotExists(): Promise<void> {
    const hasTable = await this.#knex.schema.hasTable(this.#tableName);

    if (hasTable) {
      return;
    }

    await this.#knex.schema.createTable(this.#tableName, (table) => {
      table.string(this.#featureNameColumn).notNullable();
      table.boolean(this.#valueColumn).notNullable();
      table.primary([this.#featureNameColumn]);
    });
  }

  isDatabaseDriver(): boolean {
    return true;
  }

  async initStore(): Promise<void> {
    await this.createTableIfNotExists();
  }
}
