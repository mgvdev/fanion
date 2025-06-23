import { test } from "@japa/runner";
import { FeatureManager, featureManager } from "../src/feature.js";
import { FeatureNotExistsError } from "../src/errors.js";

test.group("Feature", () => {
  test("define a feature flag", async ({ expect }) => {
    class PublicFeatureManager extends FeatureManager {
      getFeatureMap() {
        return this.featureMap;
      }
    }

    const featureManager = new PublicFeatureManager();
    featureManager.define("my-feature-flag", () => true);

    expect(featureManager.getFeatureMap().get("my-feature-flag")).toBeDefined();
  });

  test("define and test a simple feature flag", async ({ expect }) => {
    const featureManager = new FeatureManager();

    featureManager.define("my-feature-flag");

    expect(featureManager.active("my-feature-flag")).resolves.toBe(true);
  });

  test("define and test a feature flag with a context", async ({ expect }) => {
    const featureManager = new FeatureManager();
    featureManager.define(
      "my-feature-flag",
      (ctx: { user: { isAdmin: boolean } }) => ctx.user.isAdmin,
    );

    expect(
      featureManager.active("my-feature-flag", { user: { isAdmin: true } }),
    ).resolves.toBe(true);
    expect(
      featureManager.active("my-feature-flag", { user: { isAdmin: false } }),
    ).resolves.toBe(false);
  });

  test("try to retreive an undefined feature flag", async ({ expect }) => {
    const featureManager = new FeatureManager();

    expect(featureManager.active("my-feature-flag")).rejects.toThrow(
      "Feature flag 'my-feature-flag' is not defined",
    );

    expect(
      featureManager.active("my-feature-flag", { user: { isAdmin: true } }),
    ).rejects.toBeInstanceOf(FeatureNotExistsError);
  });

  test("retreive feature class from class", async ({ expect }) => {
    const fm = featureManager();
    fm.define("my-feature-flag", () => true);

    expect(fm).toBeInstanceOf(FeatureManager);
  });

  test("retreive feature class from function", async ({ expect }) => {
    const fm = featureManager();
    fm.define("my-feature-flag", () => true);

    expect(fm).toBeInstanceOf(FeatureManager);
  });
});
