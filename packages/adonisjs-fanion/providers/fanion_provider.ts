/*
|--------------------------------------------------------------------------
| Fanion Provider
|--------------------------------------------------------------------------
|
| This provider registers the Fanion service with the AdonisJS container
| and handles the initialization of the feature flag system.
|
*/

import type { ApplicationService } from '@adonisjs/core/types'
import { FanionService } from '../src/fanion_service.js'
import type { FanionConfig } from '../src/types.js'
import { createInMemoryDriver, createKnexDatabaseDriver } from 'fanion'

export default class FanionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register the Fanion service in the container
   */
  register() {
    this.app.container.singleton(FanionService, async () => {
      const config = this.app.config.get<FanionConfig>('fanion', {})

      // Create storage provider if specified
      let store = config.store

      // If no store is provided, check for storage driver configuration
      if (!store && config.storageDriver) {
        store = this.createStorageDriver(config.storageDriver)
      }

      // Create the service with the resolved configuration
      const serviceConfig: FanionConfig = {
        ...config,
        store,
      }

      const service = new FanionService(serviceConfig)

      // Initialize the service if auto-init is enabled
      if (serviceConfig.autoInit !== false) {
        await service.initialize()
      }

      return service
    })
  }

  /**
   * Boot the provider and load feature flag definitions
   */
  async boot() {
    // Load feature flag definitions from configuration
    const config = this.app.config.get<FanionConfig>('fanion', {})

    if (config.features && Array.isArray(config.features)) {
      const fanion = await this.app.container.make(FanionService)

      for (const definition of config.features) {
        try {
          await fanion.defineFromDefinition(definition)
        } catch (error) {
          console.error(`Failed to define feature flag ${definition.name}:`, error)
          throw error
        }
      }
    }
  }

  /**
   * Create a storage driver based on configuration
   */
  private createStorageDriver(driverConfig: any) {
    switch (driverConfig.type) {
      case 'memory':
        return createInMemoryDriver()

      case 'knex':
        if (!driverConfig.config?.connection) {
          throw new Error('Knex driver requires a database connection')
        }
        return createKnexDatabaseDriver(driverConfig.config)

      case 'custom':
        if (!driverConfig.config) {
          throw new Error('Custom driver requires configuration')
        }
        return driverConfig.config

      default:
        throw new Error(`Unknown storage driver type: ${driverConfig.type}`)
    }
  }

  /**
   * Shutdown hook to clean up resources
   */
  async shutdown() {
    // Add any cleanup logic here if needed
  }
}
