/*
|--------------------------------------------------------------------------
| Fanion Service Tests
|--------------------------------------------------------------------------
|
| This file contains tests for the main Fanion service functionality
| in AdonisJS applications.
|
*/

import { test } from '@japa/runner'
import { createInMemoryDriver } from 'fanion'
import { FanionServiceImpl } from '../src/fanion_service.js'
import type { FeatureContext } from '../src/types.js'

test.group('Fanion Service', () => {
  test('should create service with default configuration', async ({ assert }) => {
    const service = new FanionServiceImpl()

    assert.instanceOf(service, FanionServiceImpl)
    assert.isArray(service.getDefinedFlags())
    assert.lengthOf(service.getDefinedFlags(), 0)
  })

  test('should create service with in-memory store', async ({ assert }) => {
    const store = createInMemoryDriver()
    const service = new FanionServiceImpl({ store })

    await service.initialize()

    assert.instanceOf(service, FanionServiceImpl)
  })

  test('should define a simple feature flag', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('test-flag')

    const isActive = await service.active('test-flag')
    assert.isTrue(isActive)
    assert.include(service.getDefinedFlags(), 'test-flag')
  })

  test('should define a feature flag with check function', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('user-flag', (context: { isAdmin: boolean }) => {
      return context.isAdmin
    })

    const isActiveForAdmin = await service.active('user-flag', { isAdmin: true })
    const isActiveForUser = await service.active('user-flag', { isAdmin: false })

    assert.isTrue(isActiveForAdmin)
    assert.isFalse(isActiveForUser)
  })

  test('should define and store a feature flag', async ({ assert }) => {
    const store = createInMemoryDriver()
    const service = new FanionServiceImpl({ store })

    await service.initialize()
    await service.defineAndStore('stored-flag', true)

    const isActive = await service.active('stored-flag')
    assert.isTrue(isActive)
  })

  test('should handle feature flag not found error', async ({ assert }) => {
    const service = new FanionServiceImpl()

    await assert.rejects(
      () => service.active('non-existent-flag'),
      /Feature flag 'non-existent-flag' is not defined/
    )
  })

  test('should check multiple feature flags', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('flag-1', () => true)
    service.define('flag-2', () => false)
    service.define('flag-3', (context: { enabled: boolean }) => context.enabled)

    const results = await service.activeMany(['flag-1', 'flag-2', 'flag-3'], { enabled: true })

    assert.deepEqual(results, {
      'flag-1': true,
      'flag-2': false,
      'flag-3': true,
    })
  })

  test('should handle errors in activeMany gracefully', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('valid-flag', () => true)

    const results = await service.activeMany(['valid-flag', 'invalid-flag'])

    assert.deepEqual(results, {
      'valid-flag': true,
      'invalid-flag': false,
    })
  })

  test('should define feature from definition object', async ({ assert }) => {
    const service = new FanionServiceImpl()

    await service.defineFromDefinition({
      name: 'test-definition',
      description: 'Test feature from definition',
      check: () => true,
    })

    const isActive = await service.active('test-definition')
    assert.isTrue(isActive)
  })

  test('should define and store feature from definition object', async ({ assert }) => {
    const store = createInMemoryDriver()
    const service = new FanionServiceImpl({ store })

    await service.initialize()
    await service.defineFromDefinition({
      name: 'stored-definition',
      description: 'Test stored feature from definition',
      store: true,
      defaultValue: false,
    })

    const isActive = await service.active('stored-definition')
    assert.isFalse(isActive)
  })

  test('should use default context provider', async ({ assert }) => {
    const service = new FanionServiceImpl({
      defaultContextProvider: () => ({ defaultValue: true }),
    })

    service.define('context-flag', (context: { defaultValue: boolean }) => {
      return context.defaultValue
    })

    const isActive = await service.active('context-flag')
    assert.isTrue(isActive)
  })

  test('should handle async check functions', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('async-flag', async (context: { delay: number }) => {
      await new Promise((resolve) => setTimeout(resolve, context.delay))
      return true
    })

    const isActive = await service.active('async-flag', { delay: 10 })
    assert.isTrue(isActive)
  })

  test('should create service with database initialization', async ({ assert }) => {
    const store = createInMemoryDriver()

    const service = await FanionServiceImpl.createWithDatabase({ store })

    assert.instanceOf(service, FanionServiceImpl)
  })

  test('should throw error when creating database service without store', async ({ assert }) => {
    await assert.rejects(
      () => FanionServiceImpl.createWithDatabase({}),
      'Storage provider is required for database initialization'
    )
  })
})

test.group('Fanion Service - Feature Context', () => {
  test('should handle feature context correctly', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('user-based-flag', (context: FeatureContext) => {
      return context.user?.id === 123
    })

    const contextWithUser: FeatureContext = {
      user: { id: 123, name: 'John' },
      ip: '127.0.0.1',
    }

    const contextWithoutUser: FeatureContext = {
      ip: '127.0.0.1',
    }

    const isActiveWithUser = await service.active('user-based-flag', contextWithUser)
    const isActiveWithoutUser = await service.active('user-based-flag', contextWithoutUser)

    assert.isTrue(isActiveWithUser)
    assert.isFalse(isActiveWithoutUser)
  })

  test('should handle IP-based feature flags', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('ip-flag', (context: FeatureContext) => {
      return context.ip === '192.168.1.1'
    })

    const isActiveForIP = await service.active('ip-flag', { ip: '192.168.1.1' })
    const isActiveForOtherIP = await service.active('ip-flag', { ip: '127.0.0.1' })

    assert.isTrue(isActiveForIP)
    assert.isFalse(isActiveForOtherIP)
  })

  test('should handle user agent based flags', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('mobile-flag', (context: FeatureContext) => {
      return context.userAgent?.includes('Mobile') === true
    })

    const isActiveForMobile = await service.active('mobile-flag', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile',
    })
    const isActiveForDesktop = await service.active('mobile-flag', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    })

    assert.isTrue(isActiveForMobile)
    assert.isFalse(isActiveForDesktop)
  })
})

test.group('Fanion Service - Error Handling', () => {
  test('should handle storage initialization errors', async ({ assert }) => {
    const failingStore = {
      async set() {},
      async get() {
        return undefined
      },
      async delete() {},
      async initStore() {
        throw new Error('Storage initialization failed')
      },
    }

    const service = new FanionServiceImpl({ store: failingStore })

    await assert.rejects(() => service.initialize(), 'Storage initialization failed')
  })

  test('should handle storage errors in defineAndStore', async ({ assert }) => {
    const failingStore = {
      async set() {
        throw new Error('Storage set failed')
      },
      async get() {
        return undefined
      },
      async delete() {},
      async initStore() {},
    }

    const service = new FanionServiceImpl({ store: failingStore })

    await assert.rejects(() => service.defineAndStore('test-flag'), 'Storage set failed')
  })

  test('should handle check function errors', async ({ assert }) => {
    const service = new FanionServiceImpl()

    service.define('error-flag', () => {
      throw new Error('Check function error')
    })

    await assert.rejects(() => service.active('error-flag'), 'Check function error')
  })
})
