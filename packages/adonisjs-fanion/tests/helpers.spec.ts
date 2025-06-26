/*
|--------------------------------------------------------------------------
| Fanion Helpers Tests
|--------------------------------------------------------------------------
|
| This file contains tests for the Fanion helper functions and utilities
| used in AdonisJS applications.
|
*/

import { test } from '@japa/runner'
import { ABTesting, EnvironmentFlags, createFeatureContext } from '../src/helpers.js'

test.group('ABTesting Helpers', () => {
  test('should split users by ID correctly', async ({ assert }) => {
    const group1 = ABTesting.splitByUserId(1, 2)
    const group2 = ABTesting.splitByUserId(2, 2)
    const group3 = ABTesting.splitByUserId(3, 2)
    const group4 = ABTesting.splitByUserId(4, 2)

    assert.equal(group1, 1)
    assert.equal(group2, 0)
    assert.equal(group3, 1)
    assert.equal(group4, 0)
  })

  test('should split users by string ID correctly', async ({ assert }) => {
    const group1 = ABTesting.splitByUserId('a', 2) // length 1
    const group2 = ABTesting.splitByUserId('ab', 2) // length 2
    const group3 = ABTesting.splitByUserId('abc', 2) // length 3

    assert.equal(group1, 1)
    assert.equal(group2, 0)
    assert.equal(group3, 1)
  })

  test('should split users into multiple groups', async ({ assert }) => {
    const groups = []
    for (let i = 0; i < 12; i++) {
      groups.push(ABTesting.splitByUserId(i, 3))
    }

    // Should have all three groups represented
    assert.include(groups, 0)
    assert.include(groups, 1)
    assert.include(groups, 2)

    // Check specific values
    assert.equal(ABTesting.splitByUserId(0, 3), 0)
    assert.equal(ABTesting.splitByUserId(1, 3), 1)
    assert.equal(ABTesting.splitByUserId(2, 3), 2)
    assert.equal(ABTesting.splitByUserId(3, 3), 0)
  })

  test('should split users by IP address', async ({ assert }) => {
    const group1 = ABTesting.splitByIP('192.168.1.1', 2) // sum: 192+168+1+1 = 362
    const group2 = ABTesting.splitByIP('10.0.0.1', 2) // sum: 10+0+0+1 = 11

    assert.equal(group1, 362 % 2) // 0
    assert.equal(group2, 11 % 2) // 1
  })

  test('should handle percentage rollout', async ({ assert }) => {
    // Test with 0% rollout
    assert.isFalse(ABTesting.percentageRollout(50, 0))

    // Test with 100% rollout
    assert.isTrue(ABTesting.percentageRollout(50, 100))

    // Test with 50% rollout
    assert.isTrue(ABTesting.percentageRollout(25, 50)) // 25 % 100 = 25, which is < 50
    assert.isFalse(ABTesting.percentageRollout(75, 50)) // 75 % 100 = 75, which is >= 50
  })

  test('should create A/B test feature flag', async ({ assert }) => {
    const abTest = ABTesting.createABTest('test', 50, (ctx) => ctx.user?.id || 0)

    const contextUser25 = { user: { id: 25 } }
    const contextUser75 = { user: { id: 75 } }

    const result25 = await abTest(contextUser25)
    const result75 = await abTest(contextUser75)

    assert.isTrue(result25) // 25 < 50
    assert.isFalse(result75) // 75 >= 50
  })

  test('should handle A/B test with IP fallback', async ({ assert }) => {
    const abTest = ABTesting.createABTest('test', 30, (ctx) => ctx.user?.id || ctx.ip || 0)

    const contextWithUser = { user: { id: 20 }, ip: '192.168.1.1' }
    const contextWithoutUser = { ip: '192.168.1.1' }
    const contextEmpty = {}

    const resultWithUser = await abTest(contextWithUser)
    const resultWithoutUser = await abTest(contextWithoutUser)
    const resultEmpty = await abTest(contextEmpty)

    assert.isTrue(resultWithUser) // uses user.id = 20
    assert.isTrue(resultWithoutUser) // uses ip = '192.168.1.1' (length 11)
    assert.isTrue(resultEmpty) // uses fallback 0
  })
})

test.group('Environment Flags', () => {
  test('should detect development environment', async ({ assert }) => {
    const originalEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'development'
    assert.isTrue(EnvironmentFlags.isDevelopment())
    assert.isFalse(EnvironmentFlags.isProduction())
    assert.isFalse(EnvironmentFlags.isTesting())

    process.env.NODE_ENV = originalEnv
  })

  test('should detect production environment', async ({ assert }) => {
    const originalEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'production'
    assert.isFalse(EnvironmentFlags.isDevelopment())
    assert.isTrue(EnvironmentFlags.isProduction())
    assert.isFalse(EnvironmentFlags.isTesting())

    process.env.NODE_ENV = originalEnv
  })

  test('should detect test environment', async ({ assert }) => {
    const originalEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'test'
    assert.isFalse(EnvironmentFlags.isDevelopment())
    assert.isFalse(EnvironmentFlags.isProduction())
    assert.isTrue(EnvironmentFlags.isTesting())

    process.env.NODE_ENV = originalEnv
  })

  test('should create environment-based flag', async ({ assert }) => {
    const originalEnv = process.env.NODE_ENV

    const devAndTestFlag = EnvironmentFlags.createEnvironmentFlag(['development', 'test'])

    process.env.NODE_ENV = 'development'
    assert.isTrue(devAndTestFlag())

    process.env.NODE_ENV = 'test'
    assert.isTrue(devAndTestFlag())

    process.env.NODE_ENV = 'production'
    assert.isFalse(devAndTestFlag())

    process.env.NODE_ENV = originalEnv
  })

  test('should create development only flag', async ({ assert }) => {
    const originalEnv = process.env.NODE_ENV

    const devOnlyFlag = EnvironmentFlags.developmentOnly()

    process.env.NODE_ENV = 'development'
    assert.isTrue(devOnlyFlag())

    process.env.NODE_ENV = 'production'
    assert.isFalse(devOnlyFlag())

    process.env.NODE_ENV = 'test'
    assert.isFalse(devOnlyFlag())

    process.env.NODE_ENV = originalEnv
  })

  test('should create production only flag', async ({ assert }) => {
    const originalEnv = process.env.NODE_ENV

    const prodOnlyFlag = EnvironmentFlags.productionOnly()

    process.env.NODE_ENV = 'production'
    assert.isTrue(prodOnlyFlag())

    process.env.NODE_ENV = 'development'
    assert.isFalse(prodOnlyFlag())

    process.env.NODE_ENV = 'test'
    assert.isFalse(prodOnlyFlag())

    process.env.NODE_ENV = originalEnv
  })
})

test.group('Feature Context Helpers', () => {
  test('should create feature context from HTTP context', async ({ assert }) => {
    // Mock HTTP context
    const mockHttpContext = {
      auth: {
        user: { id: 123, name: 'John Doe' },
      },
      request: {
        ip: () => '192.168.1.1',
        header: (name: string) => {
          if (name === 'user-agent') {
            return 'Mozilla/5.0 Test Browser'
          }
          return undefined
        },
      },
    } as any

    const context = createFeatureContext(mockHttpContext, { customProp: 'test' })

    assert.equal(context.ctx, mockHttpContext)
    assert.deepEqual(context.user, { id: 123, name: 'John Doe' })
    assert.equal(context.ip, '192.168.1.1')
    assert.equal(context.userAgent, 'Mozilla/5.0 Test Browser')
    assert.equal(context.customProp, 'test')
  })

  test('should handle context without auth', async ({ assert }) => {
    const mockHttpContext = {
      request: {
        ip: () => '127.0.0.1',
        header: () => undefined,
      },
    } as any

    const context = createFeatureContext(mockHttpContext)

    assert.equal(context.ctx, mockHttpContext)
    assert.isUndefined(context.user)
    assert.equal(context.ip, '127.0.0.1')
    assert.isUndefined(context.userAgent)
  })

  test('should merge additional context properties', async ({ assert }) => {
    const mockHttpContext = {
      request: {
        ip: () => '127.0.0.1',
        header: () => undefined,
      },
    } as any

    const additional = {
      customFlag: true,
      userId: 456,
      experiment: 'A',
    }

    const context = createFeatureContext(mockHttpContext, additional)

    assert.equal(context.customFlag, true)
    assert.equal(context.userId, 456)
    assert.equal(context.experiment, 'A')
  })
})

test.group('Percentage and Distribution Tests', () => {
  test('should distribute users evenly in A/B test', async ({ assert }) => {
    const sampleSize = 1000
    const tolerance = 0.1 // 10% tolerance

    let groupA = 0
    let groupB = 0

    for (let i = 0; i < sampleSize; i++) {
      const group = ABTesting.splitByUserId(i, 2)
      if (group === 0) groupA++
      else groupB++
    }

    const ratioA = groupA / sampleSize
    const ratioB = groupB / sampleSize

    // Should be close to 50/50 split
    assert.isTrue(Math.abs(ratioA - 0.5) < tolerance)
    assert.isTrue(Math.abs(ratioB - 0.5) < tolerance)
  })

  test('should respect percentage rollout over large sample', async ({ assert }) => {
    const sampleSize = 1000
    const percentage = 25
    const tolerance = 0.05 // 5% tolerance

    let enabled = 0

    for (let i = 0; i < sampleSize; i++) {
      if (ABTesting.percentageRollout(i, percentage)) {
        enabled++
      }
    }

    const actualPercentage = (enabled / sampleSize) * 100

    assert.isTrue(Math.abs(actualPercentage - percentage) < tolerance * 100)
  })

  test('should handle edge cases in percentage rollout', async ({ assert }) => {
    // Test 0% rollout
    assert.isFalse(ABTesting.percentageRollout(0, 0))
    assert.isFalse(ABTesting.percentageRollout(50, 0))
    assert.isFalse(ABTesting.percentageRollout(99, 0))

    // Test 100% rollout
    assert.isTrue(ABTesting.percentageRollout(0, 100))
    assert.isTrue(ABTesting.percentageRollout(50, 100))
    assert.isTrue(ABTesting.percentageRollout(99, 100))

    // Test 1% rollout
    assert.isTrue(ABTesting.percentageRollout(0, 1)) // 0 % 100 = 0, which is < 1
    assert.isFalse(ABTesting.percentageRollout(1, 1)) // 1 % 100 = 1, which is >= 1
  })
})
