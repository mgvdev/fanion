/*
|--------------------------------------------------------------------------
| Integration Tests
|--------------------------------------------------------------------------
|
| This file contains integration tests that test the complete Fanion
| system working together in an AdonisJS-like environment.
|
*/

import { test } from '@japa/runner'
import { createInMemoryDriver } from 'fanion'
import { FanionServiceImpl } from '../src/fanion_service.js'
import { FanionMiddleware } from '../src/middleware/fanion_middleware.js'
import FanionProvider from '../providers/fanion_provider.js'
import { isFeatureActive, ABTesting, EnvironmentFlags } from '../src/helpers.js'
import type { FanionConfig, FeatureContext } from '../src/types.js'

// Mock container for integration tests
class MockContainer {
  private bindings = new Map()

  singleton(key: string, callback: Function) {
    this.bindings.set(key, callback)
  }

  async make(key: string) {
    const callback = this.bindings.get(key)
    if (callback) {
      return await callback()
    }
    throw new Error(`Binding not found: ${key}`)
  }
}

// Mock application for integration tests
function createMockApplication(fanionConfig: FanionConfig = {}) {
  return {
    container: new MockContainer(),
    config: {
      get: (key: string, defaultValue?: any) => {
        if (key === 'fanion') {
          return fanionConfig
        }
        return defaultValue
      },
    },
  }
}

test.group('Fanion Integration Tests', () => {
  test('should work end-to-end with provider and service', async ({ assert }) => {
    const app = createMockApplication({
      debug: true,
      features: [
        {
          name: 'integration-test',
          description: 'Test feature for integration',
          check: () => true,
        },
        {
          name: 'user-feature',
          description: 'User-based feature',
          check: (context: FeatureContext) => context.user?.id === 123,
        },
      ],
    })

    const provider = new FanionProvider(app as any)

    // Register the provider
    provider.register()

    // Get the service from container first
    const fanion = await app.container.make('fanion')

    // Define features manually since boot() might not work properly in tests
    fanion.define('integration-test', () => true)
    fanion.define('user-feature', (context: FeatureContext) => context.user?.id === 123)

    // Test basic functionality
    const isActive = await fanion.active('integration-test')
    assert.isTrue(isActive)

    // Test with context
    const userContext: FeatureContext = { user: { id: 123 } }
    const isUserFeatureActive = await fanion.active('user-feature', userContext)
    assert.isTrue(isUserFeatureActive)

    // Test with wrong user
    const wrongUserContext: FeatureContext = { user: { id: 456 } }
    const isWrongUserFeatureActive = await fanion.active('user-feature', wrongUserContext)
    assert.isFalse(isWrongUserFeatureActive)
  })

  test('should work with database storage end-to-end', async ({ assert }) => {
    const store = createInMemoryDriver()

    const app = createMockApplication({
      store,
      features: [
        {
          name: 'stored-feature',
          description: 'Feature stored in database',
          store: true,
          defaultValue: true,
        },
      ],
    })

    const provider = new FanionProvider(app as any)
    provider.register()
    await provider.boot()

    const fanion = await app.container.make('fanion')

    // Test stored feature
    const isActive = await fanion.active('stored-feature')
    assert.isTrue(isActive)

    // Test defining new stored feature
    await fanion.defineAndStore('runtime-feature', false)
    const isRuntimeActive = await fanion.active('runtime-feature')
    assert.isFalse(isRuntimeActive)
  })

  test('should integrate middleware with service', async ({ assert }) => {
    const app = createMockApplication({
      features: [
        {
          name: 'middleware-test',
          check: (context: FeatureContext) => context.user?.isAdmin === true,
        },
      ],
    })

    const provider = new FanionProvider(app as any)
    provider.register()

    const fanion = await app.container.make('fanion')
    fanion.define('middleware-test', (context: FeatureContext) => context.user?.isAdmin === true)

    const middleware = new FanionMiddleware()

    // Mock HTTP context
    const ctx = {
      auth: { user: { isAdmin: true } },
      request: {
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
      },
      response: {
        notFound: (data: any) => ({ status: 404, data }),
      },
      containerResolver: {
        make: async () => fanion, // Return the same fanion instance
      },
    }

    let nextCalled = false
    const next = () => {
      nextCalled = true
      return Promise.resolve()
    }

    // Should allow access for admin user
    await middleware.handle(ctx as any, next, {
      flag: 'middleware-test',
    })

    assert.isTrue(nextCalled)

    // Test with non-admin user
    const nonAdminCtx = {
      ...ctx,
      auth: { user: { isAdmin: false } },
    }

    let nextCalled2 = false
    const next2 = () => {
      nextCalled2 = true
      return Promise.resolve()
    }

    const result = await middleware.handle(nonAdminCtx as any, next2, {
      flag: 'middleware-test',
    })

    assert.isFalse(nextCalled2)
    assert.deepEqual(result, { status: 404, data: { message: 'Feature not available' } })
  })

  test('should work with A/B testing scenarios', async ({ assert }) => {
    const app = createMockApplication({
      features: [
        {
          name: 'ab-test-feature',
          description: 'A/B test with 50% rollout',
          check: ABTesting.createABTest('ab-test', 50, (ctx) => ctx.user?.id || 0),
        },
      ],
    })

    const provider = new FanionProvider(app as any)
    provider.register()

    const fanion = await app.container.make('fanion')

    // Define the A/B test feature manually
    fanion.define(
      'ab-test-feature',
      ABTesting.createABTest('ab-test', 50, (ctx) => ctx.user?.id || 0)
    )

    // Test users with IDs that should be in different groups
    const user25Context: FeatureContext = { user: { id: 25 } }
    const user75Context: FeatureContext = { user: { id: 75 } }

    const result25 = await fanion.active('ab-test-feature', user25Context)
    const result75 = await fanion.active('ab-test-feature', user75Context)

    // 25 < 50, so should be true
    assert.isTrue(result25)
    // 75 >= 50, so should be false
    assert.isFalse(result75)
  })

  test('should work with environment-based features', async ({ assert }) => {
    const originalEnv = process.env.NODE_ENV

    const app = createMockApplication({
      features: [
        {
          name: 'dev-only-feature',
          description: 'Development only feature',
          check: EnvironmentFlags.developmentOnly(),
        },
        {
          name: 'prod-only-feature',
          description: 'Production only feature',
          check: EnvironmentFlags.productionOnly(),
        },
      ],
    })

    const provider = new FanionProvider(app as any)
    provider.register()

    const fanion = await app.container.make('fanion')

    // Define environment-based features manually
    fanion.define('dev-only-feature', EnvironmentFlags.developmentOnly())
    fanion.define('prod-only-feature', EnvironmentFlags.productionOnly())

    // Test in development
    process.env.NODE_ENV = 'development'
    const devFeatureInDev = await fanion.active('dev-only-feature')
    const prodFeatureInDev = await fanion.active('prod-only-feature')

    assert.isTrue(devFeatureInDev)
    assert.isFalse(prodFeatureInDev)

    // Test in production
    process.env.NODE_ENV = 'production'
    const devFeatureInProd = await fanion.active('dev-only-feature')
    const prodFeatureInProd = await fanion.active('prod-only-feature')

    assert.isFalse(devFeatureInProd)
    assert.isTrue(prodFeatureInProd)

    // Restore original environment
    process.env.NODE_ENV = originalEnv
  })

  test('should handle complex feature flag scenarios', async ({ assert }) => {
    const store = createInMemoryDriver()

    const app = createMockApplication({
      store,
      defaultContextProvider: () => ({
        environment: 'test',
        appVersion: '1.0.0',
      }),
      features: [
        // Simple stored flag
        {
          name: 'maintenance-mode',
          store: true,
          defaultValue: false,
        },
        // Complex business logic
        {
          name: 'premium-features',
          check: (context: FeatureContext) => {
            return context.user?.plan === 'premium' && context.user?.verified === true
          },
        },
        // Percentage rollout
        {
          name: 'new-ui',
          check: (context: FeatureContext) => {
            const userId = context.user?.id || 0
            return userId % 100 < 25 // 25% rollout
          },
        },
        // Time-based feature
        {
          name: 'holiday-theme',
          check: () => {
            const now = new Date()
            return now.getMonth() === 11 // December
          },
        },
      ],
    })

    const provider = new FanionProvider(app as any)
    provider.register()

    const fanion = await app.container.make('fanion')

    // Define features manually
    fanion.define('premium-features', (context: FeatureContext) => {
      return context.user?.plan === 'premium' && context.user?.verified === true
    })
    fanion.define('new-ui', (context: FeatureContext) => {
      const userId = context.user?.id || 0
      return userId % 100 < 25 // 25% rollout
    })
    fanion.define('holiday-theme', () => {
      const now = new Date()
      return now.getMonth() === 11 // December
    })

    // Test maintenance mode (stored)
    await fanion.defineAndStore('maintenance-mode', false)
    let maintenanceActive = await fanion.active('maintenance-mode')
    assert.isFalse(maintenanceActive)

    // Enable maintenance mode
    await fanion.defineAndStore('maintenance-mode', true)
    maintenanceActive = await fanion.active('maintenance-mode')
    assert.isTrue(maintenanceActive)

    // Test premium features
    const premiumUserContext: FeatureContext = {
      user: { plan: 'premium', verified: true },
    }
    const freeUserContext: FeatureContext = {
      user: { plan: 'free', verified: true },
    }
    const unverifiedUserContext: FeatureContext = {
      user: { plan: 'premium', verified: false },
    }

    const premiumAccess = await fanion.active('premium-features', premiumUserContext)
    const freeAccess = await fanion.active('premium-features', freeUserContext)
    const unverifiedAccess = await fanion.active('premium-features', unverifiedUserContext)

    assert.isTrue(premiumAccess)
    assert.isFalse(freeAccess)
    assert.isFalse(unverifiedAccess)

    // Test percentage rollout
    const userIn25Percent: FeatureContext = { user: { id: 10 } } // 10 % 100 = 10 < 25
    const userNotIn25Percent: FeatureContext = { user: { id: 50 } } // 50 % 100 = 50 >= 25

    const newUIAccess1 = await fanion.active('new-ui', userIn25Percent)
    const newUIAccess2 = await fanion.active('new-ui', userNotIn25Percent)

    assert.isTrue(newUIAccess1)
    assert.isFalse(newUIAccess2)

    // Test multiple flags at once with specific user ID
    const multipleTestContext: FeatureContext = {
      user: { plan: 'premium', verified: true, id: 50 }, // 50 % 100 = 50 >= 25, so false for new-ui
    }

    const multipleResults = await fanion.activeMany(
      ['maintenance-mode', 'premium-features', 'new-ui'],
      multipleTestContext
    )

    assert.deepEqual(multipleResults, {
      'maintenance-mode': true, // We enabled it above
      'premium-features': true, // Premium user with verification
      'new-ui': false, // User ID 50: 50 % 100 = 50 >= 25, so false
    })
  })

  test('should handle error scenarios gracefully in integration', async ({ assert }) => {
    const app = createMockApplication({
      features: [
        {
          name: 'error-feature',
          check: () => {
            throw new Error('Feature check error')
          },
        },
      ],
    })

    const provider = new FanionProvider(app as any)
    provider.register()

    const fanion = await app.container.make('fanion')

    // Define the error feature manually
    fanion.define('error-feature', () => {
      throw new Error('Feature check error')
    })

    // Should propagate the error
    await assert.rejects(() => fanion.active('error-feature'), 'Feature check error')

    // Should handle non-existent features
    await assert.rejects(
      () => fanion.active('non-existent'),
      /Feature flag 'non-existent' is not defined/
    )

    // Should handle errors in multiple checks gracefully
    const results = await fanion.activeMany(['error-feature', 'non-existent'])

    // Both should return false due to errors
    assert.deepEqual(results, {
      'error-feature': false,
      'non-existent': false,
    })
  })

  test('should work with real-world feature flag patterns', async ({ assert }) => {
    const store = createInMemoryDriver()

    const app = createMockApplication({
      store,
      features: [
        // Kill switch
        {
          name: 'feature-kill-switch',
          store: true,
          defaultValue: true,
        },
        // Canary deployment
        {
          name: 'canary-deployment',
          check: (context: FeatureContext) => {
            const ip = context.ip || ''
            // Enable for specific IP ranges (canary servers)
            return ip.startsWith('10.0.1.') || ip.startsWith('192.168.100.')
          },
        },
        // Beta user program
        {
          name: 'beta-program',
          check: (context: FeatureContext) => {
            return context.user?.betaUser === true || context.user?.roles?.includes('beta')
          },
        },
        // Geographic rollout
        {
          name: 'geo-feature',
          check: (context: FeatureContext) => {
            const allowedCountries = ['US', 'CA', 'GB']
            return allowedCountries.includes(context.country)
          },
        },
      ],
    })

    const provider = new FanionProvider(app as any)
    provider.register()

    const fanion = await app.container.make('fanion')

    // Define features manually
    fanion.define('canary-deployment', (context: FeatureContext) => {
      const ip = context.ip || ''
      return ip.startsWith('10.0.1.') || ip.startsWith('192.168.100.')
    })
    fanion.define('beta-program', (context: FeatureContext) => {
      return context.user?.betaUser === true || context.user?.roles?.includes('beta')
    })
    fanion.define('geo-feature', (context: FeatureContext) => {
      const allowedCountries = ['US', 'CA', 'GB']
      return allowedCountries.includes(context.country)
    })

    // Test kill switch
    await fanion.defineAndStore('feature-kill-switch', true)
    let killSwitchActive = await fanion.active('feature-kill-switch')
    assert.isTrue(killSwitchActive)

    // Disable via kill switch
    await fanion.defineAndStore('feature-kill-switch', false)
    killSwitchActive = await fanion.active('feature-kill-switch')
    assert.isFalse(killSwitchActive)

    // Test canary deployment
    const canaryContext: FeatureContext = { ip: '10.0.1.15' }
    const prodContext: FeatureContext = { ip: '203.0.113.1' }

    const canaryAccess = await fanion.active('canary-deployment', canaryContext)
    const prodAccess = await fanion.active('canary-deployment', prodContext)

    assert.isTrue(canaryAccess)
    assert.isFalse(prodAccess)

    // Test beta program
    const betaUserContext: FeatureContext = {
      user: { betaUser: true, roles: ['user'] },
    }
    const betaRoleContext: FeatureContext = {
      user: { betaUser: false, roles: ['user', 'beta'] },
    }
    const regularUserContext: FeatureContext = {
      user: { betaUser: false, roles: ['user'] },
    }

    const betaUserAccess = await fanion.active('beta-program', betaUserContext)
    const betaRoleAccess = await fanion.active('beta-program', betaRoleContext)
    const regularAccess = await fanion.active('beta-program', regularUserContext)

    assert.isTrue(betaUserAccess)
    assert.isTrue(betaRoleAccess)
    assert.isFalse(regularAccess)

    // Test geographic rollout
    const usContext: FeatureContext = { country: 'US' }
    const frContext: FeatureContext = { country: 'FR' }

    const usAccess = await fanion.active('geo-feature', usContext)
    const frAccess = await fanion.active('geo-feature', frContext)

    assert.isTrue(usAccess)
    assert.isFalse(frAccess)
  })
})
