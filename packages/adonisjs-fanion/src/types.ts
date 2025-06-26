/*
|--------------------------------------------------------------------------
| AdonisJS Fanion Types
|--------------------------------------------------------------------------
|
| This file contains all the types used by the AdonisJS Fanion adapter
|
*/

import type { FeatureStorageProvider } from 'fanion'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Configuration for the Fanion feature manager
 */
export interface FanionConfig {
  /**
   * Storage provider for feature flags
   * If not provided, uses in-memory storage
   */
  store?: FeatureStorageProvider

  /**
   * Storage driver configuration
   * Alternative to providing a store directly
   */
  storageDriver?: StorageDriverConfig

  /**
   * Whether to automatically initialize the storage provider
   * @default true
   */
  autoInit?: boolean

  /**
   * Default context provider function
   * This function will be called to provide context when none is explicitly provided
   */
  defaultContextProvider?: (ctx?: HttpContext) => Promise<any> | any

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean

  /**
   * Array of feature flag definitions to be loaded on startup
   */
  features?: FeatureDefinition[]
}

/**
 * Feature flag definition with metadata
 */
export interface FeatureDefinition<T = any> {
  /**
   * Name of the feature flag
   */
  name: string

  /**
   * Description of the feature flag
   */
  description?: string

  /**
   * Check function for the feature flag
   */
  check?: (context: T) => Promise<boolean> | boolean

  /**
   * Default value if no check function is provided
   */
  defaultValue?: boolean

  /**
   * Whether this flag should be stored in the storage provider
   */
  store?: boolean
}

/**
 * Context object that can be passed to feature flag checks
 */
export interface FeatureContext {
  /**
   * HTTP context from AdonisJS
   */
  ctx?: HttpContext

  /**
   * Current user (if authenticated)
   */
  user?: any

  /**
   * Request IP address
   */
  ip?: string

  /**
   * User agent string
   */
  userAgent?: string

  /**
   * Custom properties
   */
  [key: string]: any
}

/**
 * Feature flag service interface
 */
export interface FanionServiceInterface {
  /**
   * Define a feature flag
   */
  define<T = FeatureContext>(name: string, check?: (context: T) => Promise<boolean> | boolean): void

  /**
   * Define a feature flag from a definition object
   */
  defineFromDefinition<T = FeatureContext>(definition: FeatureDefinition<T>): Promise<void>

  /**
   * Define and store a feature flag
   */
  defineAndStore(name: string, defaultValue?: boolean): Promise<void>

  /**
   * Check if a feature flag is active
   */
  active<T = FeatureContext>(name: string, context?: T): Promise<boolean>

  /**
   * Check if a feature flag is active with HTTP context
   */
  activeForRequest(name: string, ctx: HttpContext, additionalContext?: any): Promise<boolean>

  /**
   * Get all defined feature flags
   */
  getDefinedFlags(): string[]

  /**
   * Check multiple feature flags at once
   */
  activeMany<T = FeatureContext>(flags: string[], context?: T): Promise<Record<string, boolean>>
}

/**
 * Fanion middleware options
 */
export interface FanionMiddlewareOptions {
  /**
   * Feature flag name to check
   */
  flag: string

  /**
   * Context provider function
   */
  contextProvider?: (ctx: HttpContext) => Promise<any> | any

  /**
   * What to do when the feature is disabled
   * - 'next': Continue to next middleware/handler
   * - 'abort': Abort with 404
   * - 'redirect': Redirect to a URL
   * - 'custom': Call a custom handler
   */
  onDisabled?: 'next' | 'abort' | 'redirect' | 'custom'

  /**
   * Redirect URL when onDisabled is 'redirect'
   */
  redirectTo?: string

  /**
   * Custom handler when onDisabled is 'custom'
   */
  customHandler?: (ctx: HttpContext) => Promise<void> | void
}

/**
 * Database configuration for Knex driver
 */
export interface KnexDatabaseConfig {
  /**
   * Database connection configuration
   */
  connection: any

  /**
   * Table name for feature flags
   * @default 'feature_flags'
   */
  tableName?: string

  /**
   * Column name for feature names
   * @default 'feature_name'
   */
  featureNameColumn?: string

  /**
   * Column name for feature values
   * @default 'value'
   */
  valueColumn?: string
}

/**
 * Available storage driver types
 */
export type StorageDriverType = 'memory' | 'knex' | 'custom'

/**
 * Storage driver configuration
 */
export interface StorageDriverConfig {
  /**
   * Type of storage driver
   */
  type: StorageDriverType

  /**
   * Configuration for the storage driver
   */
  config?: KnexDatabaseConfig | any
}

/**
 * Helper function to define configuration with type safety
 */
export function defineConfig(config: FanionConfig): FanionConfig {
  return config
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    fanion: FanionServiceInterface
  }
}
