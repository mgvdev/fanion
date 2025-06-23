import { test } from "@japa/runner";
import { FeatureManager } from "../src/feature.js";
import { createInMemoryDriver } from "../src/drivers/memory.js";
import { FeatureNotExistsError } from "../src/errors.js";

test.group("Provider", () => {
  test("Should register a provider", async ({ expect }) => {
    class PublicFeatureManager extends FeatureManager {
      getProvider() {
        return this.store;
      }
    }

    const inMemoryProvider = createInMemoryDriver();
    const fm = new PublicFeatureManager({ store: inMemoryProvider });

    expect(fm.getProvider()).toBe(inMemoryProvider);
  });

  test("Should get a feature flag from a provider if not defined in the manager", async ({
    expect,
  }) => {
    const inMemoryProvider = createInMemoryDriver();
    inMemoryProvider.set("saved-feature", true);

    const fm = new FeatureManager({ store: inMemoryProvider });

    expect(fm.active("saved-feature")).resolves.toBe(true);
  });

  test("Should throw an error if the feature flag is not defined", async ({
    expect,
  }) => {
    const inMemoryProvider = createInMemoryDriver();
    const fm = new FeatureManager({ store: inMemoryProvider });

    expect(fm.active("not-defined-feature")).rejects.toThrowError();
    expect(fm.active("not-defined-feature")).rejects.toBeInstanceOf(
      FeatureNotExistsError,
    );
  });
});
