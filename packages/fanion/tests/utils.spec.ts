import { test } from "@japa/runner";
import { generateFeatureName } from "../src/utils.js";

test.group("generateFeatureName", () => {
  test("should generate feature name from a context and flag", ({ expect }) => {
    const featureName = generateFeatureName("context", "flag");
    expect(featureName).toBe("context:flag");
  });

  test("Should generate a feature name from a context, flag and sub flag", ({
    expect,
  }) => {
    const featureName = generateFeatureName("context", "flag", "subFlag");
    expect(featureName).toBe("context:flag.subFlag");
  });
});
