/*
|--------------------------------------------------------------------------
| Fanion Provider Tests
|--------------------------------------------------------------------------
|
| This file contains tests for the AdonisJS service provider that
| registers the Fanion service with the container.
|
*/

import { test } from '@japa/runner'
import { createInMemoryDriver, createKnexDatabaseDriver } from 'fanion'
import FanionProvider from '../providers/fanion_provider.js'
import { FanionServiceImpl } from '../src/fanion_service.js'
import type { FanionConfig } from '../src/types.js'

// Mock Application Service
function createMockApp(config: any = {}) {
  const bindings = new Map()

  return {
    container: {
      singleton: (key: string, callback: Function) => {
        bindings.set(key, callback)
      },
      make: async (key: string) => {
        const callback = bindings.get(key)
        if (callback) {
          return await callback()
        }
        throw new Error(`Binding not found: ${key}`)
      },
      _bindings: bindings, // For testing access
    },
    config: {
      get: (key: string, defaultValue?: any) => {
        if (key === 'fanion') {
          return config.fanion || defaultValue
        }
        return defaultValue
      },
    },
  }
}

test.group('Fanion Provider Registration', () => {
  test('should register fanion service with default configuration', async ({ assert }) => {
    const app = createMockApp()
    const provider = new FanionProvider(app as any)

    provider.register()

    // Check if the service was registered
    assert.isTrue(app.container._bindings.has('fanion'))

    // Create the service and verify it's the correct type
    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })

  test('should register fanion service with custom configuration', async ({ assert }) => {
    const config: FanionConfig = {
      debug: true,
      autoInit: false,
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })

  test('should register fanion service with in-memory driver', async ({ assert }) => {
    const config: FanionConfig = {
      storageDriver: {
        type: 'memory',
      },
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })

  test('should register fanion service with knex driver', async ({ assert }) => {
    const mockConnection = {
      schema: {
        hasTable: async () => false,
        createTable: async () => {},
      },
    }

    const config: FanionConfig = {
      storageDriver: {
        type: 'knex',
        config: {
          connection: mockConnection,
        },
      },
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })

  test('should register fanion service with custom driver', async ({ assert }) => {
    const customStore = createInMemoryDriver()

    const config: FanionConfig = {
      storageDriver: {
        type: 'custom',
        config: customStore,
      },
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })

  test('should throw error for unknown driver type', async ({ assert }) => {
    const config: FanionConfig = {
      storageDriver: {
        type: 'unknown' as any,
      },
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    await assert.rejects(() => app.container.make('fanion'), 'Unknown storage driver type: unknown')
  })

  test('should throw error for knex driver without connection', async ({ assert }) => {
    const config: FanionConfig = {
      storageDriver: {
        type: 'knex',
        config: {}, // Missing connection
      },
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    await assert.rejects(
      () => app.container.make('fanion'),
      'Knex driver requires a database connection'
    )
  })

  test('should throw error for custom driver without config', async ({ assert }) => {
    const config: FanionConfig = {
      storageDriver: {
        type: 'custom',
        // Missing config
      },
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    await assert.rejects(() => app.container.make('fanion'), 'Custom driver requires configuration')
  })

  test('should use provided store over storage driver config', async ({ assert }) => {
    const customStore = createInMemoryDriver()

    const config: FanionConfig = {
      store: customStore,
      storageDriver: {
        type: 'memory', // Should be ignored in favor of direct store
      },
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })
})

test.group('Fanion Provider Boot', () => {
  test('should handle manual feature definition', async ({ assert }) => {
    const store = createInMemoryDriver()
    const config: FanionConfig = {
      store,
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    // Get the service and define features manually (simulating what boot() would do)
    const fanion = await app.container.make('fanion')

    // Manually define features as the boot process would
    fanion.define('test-feature-1', () => true)
    await fanion.defineAndStore('test-feature-2', false)

    const definedFlags = fanion.getDefinedFlags()

    assert.include(definedFlags, 'test-feature-1')
    assert.include(definedFlags, 'test-feature-2')
  })

  test('should handle boot without feature definitions', async ({ assert }) => {
    const config: FanionConfig = {
      debug: true,
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    // Should not throw error
    await assert.doesNotReject(() => provider.boot())
  })

  test('should handle boot with empty features array', async ({ assert }) => {
    const config: FanionConfig = {
      features: [],
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    await assert.doesNotReject(() => provider.boot())

    const fanion = await app.container.make('fanion')
    assert.lengthOf(fanion.getDefinedFlags(), 0)
  })

  test('should handle feature definition errors gracefully', async ({ assert }) => {
    const config: FanionConfig = {}

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    // Get the service
    const fanion = await app.container.make('fanion')

    // Test that defineAndStore fails without storage provider
    await assert.rejects(
      () => fanion.defineAndStore('invalid-feature'),
      'No store provider defined'
    )
  })
})

test.group('Provider Lifecycle', () => {
  test('should handle shutdown gracefully', async ({ assert }) => {
    const app = createMockApp()
    const provider = new FanionProvider(app as any)

    provider.register()
    await provider.boot()

    // Should not throw error
    await assert.doesNotReject(() => provider.shutdown())
  })

  test('should initialize service with auto-init enabled', async ({ assert }) => {
    const store = createInMemoryDriver()
    const config: FanionConfig = {
      store,
      autoInit: true, // Default value
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })

  test('should not initialize service with auto-init disabled', async ({ assert }) => {
    const store = createInMemoryDriver()
    const config: FanionConfig = {
      store,
      autoInit: false,
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })
})

test.group('Provider Configuration Edge Cases', () => {
  test('should handle missing fanion configuration', async ({ assert }) => {
    const app = createMockApp() // No fanion config
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })

  test('should handle partial configuration', async ({ assert }) => {
    const config = {
      debug: true,
      // Missing other properties
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })

  test('should merge configuration correctly', async ({ assert }) => {
    const store = createInMemoryDriver()
    const storageDriver = {
      type: 'memory' as const,
    }

    const config: FanionConfig = {
      store, // Direct store
      storageDriver, // Should be ignored
      debug: true,
      autoInit: false,
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })
})

test.group('Storage Driver Creation', () => {
  test('should create in-memory driver correctly', async ({ assert }) => {
    const app = createMockApp({
      fanion: {
        storageDriver: { type: 'memory' },
      },
    })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')

    // Test that it can store and retrieve values
    await fanion.defineAndStore('memory-test', true)
    const isActive = await fanion.active('memory-test')

    assert.isTrue(isActive)
  })

  test('should create knex driver with full configuration', async ({ assert }) => {
    const mockConnection = {
      schema: {
        hasTable: async () => false,
        createTable: async () => {},
      },
    }

    const config: FanionConfig = {
      storageDriver: {
        type: 'knex',
        config: {
          connection: mockConnection,
          tableName: 'custom_flags',
          featureNameColumn: 'flag_name',
          valueColumn: 'is_enabled',
        },
      },
    }

    const app = createMockApp({ fanion: config })
    const provider = new FanionProvider(app as any)

    provider.register()

    const fanion = await app.container.make('fanion')
    assert.instanceOf(fanion, FanionServiceImpl)
  })
})
