import { test } from "@japa/runner";
import knex from "knex";
import { createKnexDatabaseDriver } from "../../../src/drivers/databases/knex.js";
import { featureManagerWithDatabase } from "../../../src/feature.js";

test.group("Database drivers", () => {
  test("Should create table if it doesn't exist when database driver is used", async ({
    expect,
  }) => {
    const db = knex({
      client: "sqlite3",
      connection: {
        filename: ":memory:",
      },
      useNullAsDefault: true,
    });

    const knexDriver = createKnexDatabaseDriver({
      connection: db,
      featureNameColumn: "feature_name",
      tableName: "features",
      valueColumn: "activated",
    });

    const featureManager = await featureManagerWithDatabase({
      store: knexDriver,
    });

    const hasTable = await db.schema.hasTable("features");
    expect(hasTable).toBe(true);

    db.destroy();
  });

  test("Feature manager should return a feature from the database", async ({
    expect,
  }) => {
    const db = knex({
      client: "sqlite3",
      connection: {
        filename: ":memory:",
      },
      useNullAsDefault: true,
    });

    const knexDriver = createKnexDatabaseDriver({
      connection: db,
      featureNameColumn: "feature_name",
      tableName: "features",
      valueColumn: "activated",
    });

    const featureManager = await featureManagerWithDatabase({
      store: knexDriver,
    });

    await db("features").insert({
      feature_name: "test",
      activated: true,
    });

    const feature = await featureManager.active("test");

    expect(feature).toBe(true);

    await db.destroy();
  });

  test("Should store a feature in the database via the feature manager", async ({
    expect,
  }) => {
    const db = knex({
      client: "sqlite3",
      connection: {
        filename: ":memory:",
      },
      useNullAsDefault: true,
    });

    const knexDriver = createKnexDatabaseDriver({
      connection: db,
      featureNameColumn: "feature_name",
      tableName: "features",
      valueColumn: "activated",
    });

    const featureManager = await featureManagerWithDatabase({
      store: knexDriver,
    });

    await featureManager.defineAndStore("test", true);

    const feature = await db("features").where("feature_name", "test");

    /**
     * The value are transformed to booleans in the database driver
     */
    expect(feature[0].activated).toBe(1);

    await db.destroy();
  });
});
