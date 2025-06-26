/*
|--------------------------------------------------------------------------
| Fanion Helpers
|--------------------------------------------------------------------------
|
| This file contains helper functions and decorators to make working
| with feature flags easier in AdonisJS applications.
|
*/

import type { HttpContext } from '@adonisjs/core/http'
import type { FanionServiceInterface, FeatureContext } from './types.js'

/**
 * Helper function to check if a feature is active
 * Can be used in controllers, services, or anywhere in the application
 */
export async function isFeatureActive<T = FeatureContext>(
  flagName: string,
  context?: T
): Promise<boolean> {
  const { default: app } = await import('@adonisjs/core/services/app')
  const fanion = await app.container.make('fanion')
  return fanion.active(flagName, context)
}

/**
 * Helper function to check if a feature is active for a specific HTTP request
 */
export async function isFeatureActiveForRequest(
  flagName: string,
  ctx: HttpContext,
  additionalContext?: any
): Promise<boolean> {
  const fanion = await ctx.containerResolver.make('fanion')
  return fanion.activeForRequest(flagName, ctx, additionalContext)
}

/**
 * Helper function to check multiple features at once
 */
export async function areFeacuresActive<T = FeatureContext>(
  flagNames: string[],
  context?: T
): Promise<Record<string, boolean>> {
  const { default: app } = await import('@adonisjs/core/services/app')
  const fanion = await app.container.make('fanion')
  return fanion.activeMany(flagNames, context)
}

/**
 * Helper function to get feature flags for a user
 */
export async function getUserFeatures(
  user: any,
  flagNames?: string[]
): Promise<Record<string, boolean>> {
  const context: FeatureContext = { user }

  if (flagNames) {
    return areFeacuresActive(flagNames, context)
  }

  // If no specific flags requested, get all defined flags
  const { default: app } = await import('@adonisjs/core/services/app')
  const fanion = await app.container.make('fanion')
  const allFlags = fanion.getDefinedFlags()

  return areFeacuresActive(allFlags, context)
}

/**
 * Conditional execution based on feature flag
 */
export async function ifFeatureActive<T = FeatureContext>(
  flagName: string,
  callback: () => Promise<any> | any,
  context?: T
): Promise<any> {
  const isActive = await isFeatureActive(flagName, context)

  if (isActive) {
    return callback()
  }

  return undefined
}

/**
 * Execute different callbacks based on feature flag status
 */
export async function ifFeatureElse<T = FeatureContext>(
  flagName: string,
  onActive: () => Promise<any> | any,
  onInactive: () => Promise<any> | any,
  context?: T
): Promise<any> {
  const isActive = await isFeatureActive(flagName, context)

  return isActive ? onActive() : onInactive()
}

/**
 * Feature flag decorator for controller methods
 * Usage: @requireFeature('my-feature')
 */
export function requireFeature(
  flagName: string,
  options: {
    contextProvider?: (ctx: HttpContext) => any
    onDisabled?: 'abort' | 'redirect' | 'custom'
    redirectTo?: string
    customHandler?: (ctx: HttpContext) => any
  } = {}
) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (this: any, ...args: any[]) {
      // Assume the first argument is HttpContext for controller methods
      const ctx = args[0] as HttpContext

      if (!ctx || typeof ctx.containerResolver?.make !== 'function') {
        throw new Error(
          '@requireFeature decorator can only be used on controller methods with HttpContext'
        )
      }

      const fanion = await ctx.containerResolver.make('fanion')

      const context = options.contextProvider ? await options.contextProvider(ctx) : undefined

      const isActive = await fanion.activeForRequest(flagName, ctx, context)

      if (!isActive) {
        const action = options.onDisabled || 'abort'

        switch (action) {
          case 'abort':
            return ctx.response.notFound({ message: 'Feature not available' })

          case 'redirect':
            if (!options.redirectTo) {
              throw new Error('redirectTo option is required when onDisabled is "redirect"')
            }
            return ctx.response.redirect(options.redirectTo)

          case 'custom':
            if (!options.customHandler) {
              throw new Error('customHandler option is required when onDisabled is "custom"')
            }
            return options.customHandler(ctx)
        }
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Feature flag property decorator for controller properties
 * Usage: @featureFlag('my-feature') private myFeature!: boolean
 */
export function featureFlag(flagName: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: async function () {
        // This assumes the controller has access to HttpContext via 'ctx' property
        if (this.ctx && typeof this.ctx.containerResolver?.make === 'function') {
          const fanion = await this.ctx.containerResolver.make('fanion')
          return fanion.activeForRequest(flagName, this.ctx)
        }

        // Fallback to global check
        return isFeatureActive(flagName)
      },
      enumerable: true,
      configurable: true,
    })
  }
}

/**
 * Create a feature context from HTTP context
 */
export function createFeatureContext(ctx: HttpContext, additional: any = {}): FeatureContext {
  return {
    ctx,
    // @ts-expect-error: auth is not available in HttpContext
    user: ctx.auth?.user,
    ip: ctx.request.ip(),
    userAgent: ctx.request.header('user-agent'),
    ...additional,
  }
}

/**
 * A/B Testing helper
 */
export class ABTesting {
  /**
   * Split users into groups based on user ID
   */
  static splitByUserId(userId: number | string, groupCount: number = 2): number {
    const id = typeof userId === 'string' ? userId.length : userId
    return id % groupCount
  }

  /**
   * Split users into groups based on IP address
   */
  static splitByIP(ip: string, groupCount: number = 2): number {
    const hash = ip.split('.').reduce((acc, part) => acc + Number.parseInt(part), 0)
    return hash % groupCount
  }

  /**
   * Percentage-based rollout
   */
  static percentageRollout(identifier: number | string, percentage: number): boolean {
    const id = typeof identifier === 'string' ? identifier.length : identifier
    return id % 100 < percentage
  }

  /**
   * Create an A/B test feature flag
   */
  static createABTest(
    _testName: string,
    percentage: number = 50,
    identifier: (context: FeatureContext) => number | string = (ctx) => ctx.user?.id || ctx.ip || 0
  ) {
    return async (context: FeatureContext) => {
      const id = identifier(context)
      return ABTesting.percentageRollout(id, percentage)
    }
  }
}

/**
 * Feature flag utilities for views/templates
 */
export class ViewHelpers {
  /**
   * Create view globals for feature flags
   */
  static createViewGlobals(fanion: FanionServiceInterface) {
    return {
      /**
       * Check if feature is active in views
       */
      isFeatureActive: async (flagName: string) => {
        try {
          return await fanion.active(flagName)
        } catch {
          return false
        }
      },

      /**
       * Get multiple feature flags for views
       */
      getFeatures: async (flagNames: string[]) => {
        try {
          return await fanion.activeMany(flagNames)
        } catch {
          return flagNames.reduce((acc, flag) => ({ ...acc, [flag]: false }), {})
        }
      },
    }
  }
}

/**
 * Environment-based feature flags
 */
export class EnvironmentFlags {
  /**
   * Check if we're in development
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  /**
   * Check if we're in production
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  /**
   * Check if we're in testing
   */
  static isTesting(): boolean {
    return process.env.NODE_ENV === 'test'
  }

  /**
   * Create environment-based feature flag
   */
  static createEnvironmentFlag(environments: string[]) {
    return () => environments.includes(process.env.NODE_ENV || 'development')
  }

  /**
   * Create development-only feature flag
   */
  static developmentOnly() {
    return () => EnvironmentFlags.isDevelopment()
  }

  /**
   * Create production-only feature flag
   */
  static productionOnly() {
    return () => EnvironmentFlags.isProduction()
  }
}
