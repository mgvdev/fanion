/*
|--------------------------------------------------------------------------
| Package entrypoint
|--------------------------------------------------------------------------
|
| Export values from the package entrypoint as you see fit.
|
*/

export { configure } from './configure.js'

// Main service exports
export {
  FanionService,
  createFanionService,
  createFanionServiceWithDatabase,
} from './src/fanion_service.js'

// Types
export type {
  FanionConfig,
  FanionServiceInterface,
  FeatureDefinition,
  FeatureContext,
  FanionMiddlewareOptions,
  KnexDatabaseConfig,
  StorageDriverConfig,
  StorageDriverType,
} from './src/types.js'

export { defineConfig } from './src/types.js'

// Middleware
export {
  FanionMiddleware,
  createFanionMiddleware,
  featureFlag,
  featureFlagWithRedirect,
  featureFlagWithHandler,
} from './src/middleware/fanion_middleware.js'

// Helpers
export {
  isFeatureActive,
  isFeatureActiveForRequest,
  areFeacuresActive,
  getUserFeatures,
  ifFeatureActive,
  ifFeatureElse,
  requireFeature,
  featureFlag as featureFlagDecorator,
  createFeatureContext,
  ABTesting,
  ViewHelpers,
  EnvironmentFlags,
} from './src/helpers.js'
