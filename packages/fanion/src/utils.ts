/**
 * Utility to ensure consistant feautre name
 *
 * @param context
 * @param flag
 * @returns
 */
export function generateFeatureName(
  context: string,
  flag: string,
  subFlag: string = "",
): string {
  if (!context) {
    throw new Error("Context is required");
  }

  if (!flag) {
    throw new Error("Flag is required");
  }

  if (subFlag === "") {
    return `${context}:${flag}`;
  }

  return `${context}:${flag}.${subFlag}`;
}
