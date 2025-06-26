/*
|--------------------------------------------------------------------------
| Fanion Middleware
|--------------------------------------------------------------------------
|
| This middleware allows you to protect routes based on feature flags.
| If a feature flag is disabled, you can configure different behaviors
| like aborting with 404, redirecting, or calling custom handlers.
|
*/

import type { HttpContext } from '@adonisjs/core/http'
import type { FanionMiddlewareOptions } from '../types.js'

export class FanionMiddleware {
  /**
   * Handle the request and check feature flags
   */
  async handle(
    ctx: HttpContext,
    next: () => Promise<void>,
    options: FanionMiddlewareOptions
  ): Promise<any> {
    const fanion = await ctx.containerResolver.make('fanion')

    // Get context for feature flag evaluation
    const context = options.contextProvider ? await options.contextProvider(ctx) : undefined

    // Check if the feature flag is active
    const isActive = await fanion.activeForRequest(options.flag, ctx, context)

    if (isActive) {
      // Feature is enabled, continue to next middleware/handler
      return next()
    }

    // Feature is disabled, handle according to configuration
    const result = await this.handleDisabledFeature(ctx, options)

    // If result is undefined (next action), continue to next middleware
    if (result === undefined) {
      return next()
    }

    return result
  }

  /**
   * Handle the case when a feature is disabled
   */
  private async handleDisabledFeature(
    ctx: HttpContext,
    options: FanionMiddlewareOptions
  ): Promise<any> {
    const action = options.onDisabled || 'abort'

    switch (action) {
      case 'next':
        // Continue to next middleware/handler anyway
        return undefined

      case 'abort':
        // Abort with 404 Not Found
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
        return await options.customHandler(ctx)

      default:
        throw new Error(`Unknown onDisabled action: ${action}`)
    }
  }
}

/**
 * Factory function to create middleware with specific options
 */
export function createFanionMiddleware(options: FanionMiddlewareOptions) {
  return async (ctx: HttpContext, next: () => Promise<void>) => {
    const middleware = new FanionMiddleware()
    return middleware.handle(ctx, next, options)
  }
}

/**
 * Helper function to create a feature flag middleware with simple flag check
 */
export function featureFlag(
  flagName: string,
  onDisabled: FanionMiddlewareOptions['onDisabled'] = 'abort'
) {
  return createFanionMiddleware({
    flag: flagName,
    onDisabled,
  })
}

/**
 * Helper function to create a feature flag middleware with redirect
 */
export function featureFlagWithRedirect(flagName: string, redirectTo: string) {
  return createFanionMiddleware({
    flag: flagName,
    onDisabled: 'redirect',
    redirectTo,
  })
}

/**
 * Helper function to create a feature flag middleware with custom handler
 */
export function featureFlagWithHandler(
  flagName: string,
  customHandler: (ctx: HttpContext) => Promise<void> | void
) {
  return createFanionMiddleware({
    flag: flagName,
    onDisabled: 'custom',
    customHandler,
  })
}
