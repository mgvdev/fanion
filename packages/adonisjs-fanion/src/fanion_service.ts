/*
|--------------------------------------------------------------------------
| Fanion Service
|--------------------------------------------------------------------------
|
| This service provides the main interface for managing feature flags
| in AdonisJS applications using the Fanion library.
|
*/

import { FeatureManager, featureManagerWithDatabase } from 'fanion'
import type { HttpContext } from '@adonisjs/core/http'
import type {
  FanionConfig,
  FanionServiceInterface,
  FeatureDefinition,
  FeatureContext,
} from './types.js'

export class FanionService implements FanionServiceInterface {
  /**
   * The underlying Fanion feature manager
   */
  private featureManager: FeatureManager

  /**
   * Configuration object
   */
  private config: FanionConfig

  /**
   * Set of defined feature flags for tracking
   */
  private definedFlags = new Set<string>()

  constructor(config: FanionConfig = {}) {
    this.config = {
      autoInit: true,
      debug: false,
      ...config,
    }

    // Initialize the feature manager
    this.featureManager = new FeatureManager(
      this.config.store ? { store: this.config.store } : undefined
    )
  }

  /**
   * Initialize the service with database support if needed
   */
  async initialize(): Promise<void> {
    if (this.config.store && this.config.autoInit) {
      try {
        await this.featureManager.initStore()
        this.log('Fanion service initialized with storage provider')
      } catch (error) {
        this.log('Failed to initialize Fanion storage provider:', error)
        throw error
      }
    }
  }

  /**
   * Create a service instance with database initialization
   */
  static async createWithDatabase(config: FanionConfig): Promise<FanionService> {
    if (!config.store) {
      throw new Error('Storage provider is required for database initialization')
    }

    const featureManager = await featureManagerWithDatabase({ store: config.store })
    const service = new FanionService(config)
    service.featureManager = featureManager

    return service
  }

  /**
   * Define a feature flag
   */
  define<T = FeatureContext>(
    name: string,
    check?: (context: T) => Promise<boolean> | boolean
  ): void {
    this.featureManager.define(name, check)
    this.definedFlags.add(name)
    this.log(`Defined feature flag: ${name}`)
  }

  /**
   * Define a feature flag from a definition object
   */
  async defineFromDefinition<T = FeatureContext>(definition: FeatureDefinition<T>): Promise<void> {
    const { name, check, defaultValue = true, store = false } = definition

    if (store && this.config.store) {
      await this.defineAndStore(name, defaultValue)
    } else {
      this.define(name, check)
    }

    this.log(`Defined feature flag from definition: ${name}`)
  }

  /**
   * Define and store a feature flag
   */
  async defineAndStore(name: string, defaultValue = true): Promise<void> {
    await this.featureManager.defineAndStore(name, defaultValue)
    this.definedFlags.add(name)
    this.log(`Defined and stored feature flag: ${name} = ${defaultValue}`)
  }

  /**
   * Check if a feature flag is active
   */
  async active<T = FeatureContext>(name: string, context?: T): Promise<boolean> {
    try {
      // If no context provided and we have a default context provider, use it
      let actualContext = context
      if (!actualContext && this.config.defaultContextProvider) {
        actualContext = await this.config.defaultContextProvider()
      }

      const result = await this.featureManager.active(name, actualContext)
      this.log(`Feature flag ${name} is ${result ? 'active' : 'inactive'}`)
      return result
    } catch (error) {
      this.log(`Error checking feature flag ${name}:`, error)
      throw error
    }
  }

  /**
   * Check if a feature flag is active with HTTP context
   */
  async activeForRequest(
    name: string,
    ctx: HttpContext,
    additionalContext: any = {}
  ): Promise<boolean> {
    const context: FeatureContext = {
      ctx,
      // @ts-expect-error: auth is not available in HttpContext
      user: ctx.auth?.user,
      ip: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent'),
      ...additionalContext,
    }

    return this.active(name, context)
  }

  /**
   * Get all defined feature flags
   */
  getDefinedFlags(): string[] {
    return Array.from(this.definedFlags)
  }

  /**
   * Check multiple feature flags at once
   */
  async activeMany<T = FeatureContext>(
    flags: string[],
    context?: T
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    // Use Promise.all for concurrent checking
    const promises = flags.map(async (flag) => {
      try {
        const isActive = await this.active(flag, context)
        return { flag, isActive }
      } catch (error) {
        this.log(`Error checking feature flag ${flag}:`, error)
        return { flag, isActive: false }
      }
    })

    const resolvedResults = await Promise.all(promises)

    for (const { flag, isActive } of resolvedResults) {
      results[flag] = isActive
    }

    return results
  }

  /**
   * Get the underlying feature manager (for advanced usage)
   */
  getFeatureManager(): FeatureManager {
    return this.featureManager
  }

  /**
   * Log messages if debug is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[Fanion] ${message}`, ...args)
    }
  }
}

/**
 * Factory function to create a new Fanion service
 */
export function createFanionService(config: FanionConfig = {}): FanionService {
  return new FanionService(config)
}

/**
 * Factory function to create a Fanion service with database initialization
 */
export async function createFanionServiceWithDatabase(
  config: FanionConfig
): Promise<FanionService> {
  return FanionService.createWithDatabase(config)
}
