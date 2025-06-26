/*
|--------------------------------------------------------------------------
| Fanion Middleware Tests
|--------------------------------------------------------------------------
|
| This file contains tests for the Fanion middleware functionality
| used to protect routes based on feature flags.
|
*/

import { test } from '@japa/runner'
import {
  FanionMiddleware,
  createFanionMiddleware,
  featureFlag,
} from '../src/middleware/fanion_middleware.js'
import { FanionServiceImpl } from '../src/fanion_service.js'

// Mock HTTP Context
function createMockHttpContext(overrides: any = {}) {
  return {
    request: {
      ip: () => '127.0.0.1',
      header: (name: string) => {
        if (name === 'user-agent') return 'Test User Agent'
        return undefined
      },
      ...overrides.request,
    },
    response: {
      notFound: (data?: any) => ({ status: 404, data }),
      redirect: (url: string) => ({ status: 302, location: url }),
      ...overrides.response,
    },
    auth: {
      user: { id: 123, name: 'Test User' },
      ...overrides.auth,
    },
    containerResolver: {
      make: async (binding: string) => {
        if (binding === 'fanion') {
          return overrides.fanionService || createMockFanionService()
        }
        throw new Error(`Unknown binding: ${binding}`)
      },
      ...overrides.containerResolver,
    },
    ...overrides,
  }
}

function createMockFanionService() {
  const service = new FanionServiceImpl()

  // Define some test flags
  service.define('enabled-feature', () => true)
  service.define('disabled-feature', () => false)
  service.define('user-based-feature', (context: any) => context.user?.id === 123)

  return service
}

function createMockNext() {
  let called = false
  const next = () => {
    called = true
    return Promise.resolve()
  }
  next.wasCalled = () => called
  return next
}

test.group('Fanion Middleware', () => {
  test('should allow access when feature is enabled', async ({ assert }) => {
    const middleware = new FanionMiddleware()
    const ctx = createMockHttpContext()
    const next = createMockNext()

    await middleware.handle(ctx, next, {
      flag: 'enabled-feature',
    })

    assert.isTrue(next.wasCalled())
  })

  test('should deny access when feature is disabled with default abort', async ({ assert }) => {
    const middleware = new FanionMiddleware()
    const ctx = createMockHttpContext()
    const next = createMockNext()

    const result = await middleware.handle(ctx, next, {
      flag: 'disabled-feature',
    })

    assert.isFalse(next.wasCalled())
    assert.deepEqual(result, { status: 404, data: { message: 'Feature not available' } })
  })

  test('should continue when onDisabled is "next"', async ({ assert }) => {
    const middleware = new FanionMiddleware()
    const ctx = createMockHttpContext()
    const next = createMockNext()

    await middleware.handle(ctx, next, {
      flag: 'disabled-feature',
      onDisabled: 'next',
    })

    assert.isTrue(next.wasCalled())
  })

  test('should redirect when onDisabled is "redirect"', async ({ assert }) => {
    const middleware = new FanionMiddleware()
    const ctx = createMockHttpContext()
    const next = createMockNext()

    const result = await middleware.handle(ctx, next, {
      flag: 'disabled-feature',
      onDisabled: 'redirect',
      redirectTo: '/maintenance',
    })

    assert.isFalse(next.wasCalled())
    assert.deepEqual(result, { status: 302, location: '/maintenance' })
  })

  test('should throw error when redirect URL is missing', async ({ assert }) => {
    const middleware = new FanionMiddleware()
    const ctx = createMockHttpContext()
    const next = createMockNext()

    await assert.rejects(
      () =>
        middleware.handle(ctx, next, {
          flag: 'disabled-feature',
          onDisabled: 'redirect',
        }),
      'redirectTo option is required when onDisabled is "redirect"'
    )
  })

  test('should call custom handler when onDisabled is "custom"', async ({ assert }) => {
    const middleware = new FanionMiddleware()
    const ctx = createMockHttpContext()
    const next = createMockNext()

    let customHandlerCalled = false
    const customHandler = (context: any) => {
      customHandlerCalled = true
      return { custom: 'response' }
    }

    const result = await middleware.handle(ctx, next, {
      flag: 'disabled-feature',
      onDisabled: 'custom',
      customHandler,
    })

    assert.isFalse(next.wasCalled())
    assert.isTrue(customHandlerCalled)
    assert.deepEqual(result, { custom: 'response' })
  })

  test('should throw error when custom handler is missing', async ({ assert }) => {
    const middleware = new FanionMiddleware()
    const ctx = createMockHttpContext()
    const next = createMockNext()

    await assert.rejects(
      () =>
        middleware.handle(ctx, next, {
          flag: 'disabled-feature',
          onDisabled: 'custom',
        }),
      'customHandler option is required when onDisabled is "custom"'
    )
  })

  test('should use context provider', async ({ assert }) => {
    const middleware = new FanionMiddleware()

    let contextProviderCalled = false
    const contextProvider = (ctx: any) => {
      contextProviderCalled = true
      return { customContext: true }
    }

    const mockService = createMockFanionService()
    mockService.define('context-feature', (context: any) => {
      return context.customContext === true
    })

    const ctx = createMockHttpContext({
      fanionService: mockService,
    })
    const next = createMockNext()

    await middleware.handle(ctx, next, {
      flag: 'context-feature',
      contextProvider,
    })

    assert.isTrue(contextProviderCalled)
    assert.isTrue(next.wasCalled())
  })

  test('should throw error for unknown onDisabled action', async ({ assert }) => {
    const middleware = new FanionMiddleware()
    const ctx = createMockHttpContext()
    const next = createMockNext()

    await assert.rejects(
      () =>
        middleware.handle(ctx, next, {
          flag: 'disabled-feature',
          onDisabled: 'unknown' as any,
        }),
      'Unknown onDisabled action: unknown'
    )
  })
})

test.group('Middleware Factory Functions', () => {
  test('should create middleware with createFanionMiddleware', async ({ assert }) => {
    const middlewareFunc = createFanionMiddleware({
      flag: 'enabled-feature',
    })

    const ctx = createMockHttpContext()
    const next = createMockNext()

    await middlewareFunc(ctx, next)

    assert.isTrue(next.wasCalled())
  })

  test('should create simple feature flag middleware', async ({ assert }) => {
    const middlewareFunc = featureFlag('enabled-feature')

    const ctx = createMockHttpContext()
    const next = createMockNext()

    await middlewareFunc(ctx, next)

    assert.isTrue(next.wasCalled())
  })

  test('should create feature flag middleware with custom onDisabled', async ({ assert }) => {
    const middlewareFunc = featureFlag('disabled-feature', 'next')

    const ctx = createMockHttpContext()
    const next = createMockNext()

    await middlewareFunc(ctx, next)

    assert.isTrue(next.wasCalled())
  })

  test('should handle middleware creation with disabled feature', async ({ assert }) => {
    const middlewareFunc = featureFlag('disabled-feature', 'abort')

    const ctx = createMockHttpContext()
    const next = createMockNext()

    const result = await middlewareFunc(ctx, next)

    assert.isFalse(next.wasCalled())
    assert.deepEqual(result, { status: 404, data: { message: 'Feature not available' } })
  })
})

test.group('Middleware Integration', () => {
  test('should work with user-based feature flags', async ({ assert }) => {
    const middleware = new FanionMiddleware()

    const ctxWithCorrectUser = createMockHttpContext({
      auth: { user: { id: 123 } },
    })
    const ctxWithWrongUser = createMockHttpContext({
      auth: { user: { id: 456 } },
    })

    const next1 = createMockNext()
    const next2 = createMockNext()

    // Should allow access for correct user
    await middleware.handle(ctxWithCorrectUser, next1, {
      flag: 'user-based-feature',
    })

    // Should deny access for wrong user
    const result = await middleware.handle(ctxWithWrongUser, next2, {
      flag: 'user-based-feature',
    })

    assert.isTrue(next1.wasCalled())
    assert.isFalse(next2.wasCalled())
    assert.deepEqual(result, { status: 404, data: { message: 'Feature not available' } })
  })

  test('should handle feature flag errors gracefully', async ({ assert }) => {
    const middleware = new FanionMiddleware()

    const mockService = {
      activeForRequest: async () => {
        throw new Error('Feature flag error')
      },
    }

    const ctx = createMockHttpContext({
      fanionService: mockService,
    })
    const next = createMockNext()

    await assert.rejects(
      () =>
        middleware.handle(ctx, next, {
          flag: 'error-feature',
        }),
      'Feature flag error'
    )
  })

  test('should pass through additional context', async ({ assert }) => {
    const middleware = new FanionMiddleware()

    let receivedContext: any = null
    const mockService = {
      activeForRequest: async (flagName: string, ctx: any, additionalContext: any) => {
        receivedContext = additionalContext
        return true
      },
    }

    const contextProvider = () => ({ custom: 'data' })

    const ctx = createMockHttpContext({
      fanionService: mockService,
    })
    const next = createMockNext()

    await middleware.handle(ctx, next, {
      flag: 'test-feature',
      contextProvider,
    })

    assert.deepEqual(receivedContext, { custom: 'data' })
    assert.isTrue(next.wasCalled())
  })
})

test.group('Middleware Error Handling', () => {
  test('should handle missing fanion service', async ({ assert }) => {
    const middleware = new FanionMiddleware()

    const ctx = createMockHttpContext({
      containerResolver: {
        make: async () => {
          throw new Error('Service not found')
        },
      },
    })
    const next = createMockNext()

    await assert.rejects(
      () =>
        middleware.handle(ctx, next, {
          flag: 'test-feature',
        }),
      'Service not found'
    )
  })

  test('should handle async context provider errors', async ({ assert }) => {
    const middleware = new FanionMiddleware()

    const contextProvider = async () => {
      throw new Error('Context provider error')
    }

    const ctx = createMockHttpContext()
    const next = createMockNext()

    await assert.rejects(
      () =>
        middleware.handle(ctx, next, {
          flag: 'enabled-feature',
          contextProvider,
        }),
      'Context provider error'
    )
  })

  test('should handle async custom handler errors', async ({ assert }) => {
    const middleware = new FanionMiddleware()

    const customHandler = async () => {
      throw new Error('Custom handler error')
    }

    const ctx = createMockHttpContext()
    const next = createMockNext()

    await assert.rejects(
      () =>
        middleware.handle(ctx, next, {
          flag: 'disabled-feature',
          onDisabled: 'custom',
          customHandler,
        }),
      'Custom handler error'
    )
  })
})
