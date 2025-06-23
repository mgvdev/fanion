export interface FlagActor {
  /**
   * Return if a feature flag is enabled or not for a given feature
   **/
  active(scope: string): Promise<boolean>;
}
