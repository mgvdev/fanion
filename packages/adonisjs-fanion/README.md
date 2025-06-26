# AdonisJS Fanion 🏁

> AdonisJS adapter for the Fanion feature flagging library

![npm version](https://img.shields.io/npm/v/@fanion/adonisjs)
![npm downloads](https://img.shields.io/npm/dm/@fanion/adonisjs)
![license](https://img.shields.io/npm/l/@fanion/adonisjs)

AdonisJS Fanion is the official AdonisJS adapter for the [Fanion](https://github.com/mgvdev/fanion) feature flagging library. It provides a seamless integration with AdonisJS applications, allowing you to control feature rollouts, conduct A/B tests, and manage application behavior dynamically.

## Features

- 🚀 **AdonisJS Native** - Built specifically for AdonisJS v6 with full IoC support
- 🔧 **TypeScript First** - Complete type safety and IntelliSense support
- 🏪 **Multiple Storage Options** - Memory, database, or custom storage providers
- 🎯 **Context-Aware** - Automatic HTTP context integration
- 🛡️ **Middleware Support** - Protect routes with feature flags
- 🎨 **Decorators** - Use decorators in controllers for feature gating
- 📊 **A/B Testing** - Built-in utilities for A/B testing and gradual rollouts
- 🌍 **Environment Support** - Environment-based feature flags

## Installation

```bash
npm install @fanion/adonisjs
```

Next, configure the package using the configure command:

```bash
node ace configure @fanion/adonisjs
```

This will:

- Create a `config/fanion.ts` configuration file
- Register the service provider
- Set up environment variables
- Optionally install database drivers

## Quick Start

### Basic Usage

```typescript
// Define feature flags in config/fanion.ts
export default defineConfig({
  features: [
    {
      name: 'new-dashboard',
      description: 'Enable new dashboard design',
      check: () => true,
    },
    {
      name: 'beta-features',
      description: 'Enable beta features for specific users',
      check: (context) => context.user?.isBetaUser === true,
    },
  ],
})
```

```typescript
// Use in controllers
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { FanionService } from '@fanion/adonisjs/types'

export default class DashboardController {
  @inject()
  async index({ response, auth }: HttpContext, fanion: FanionService) {
    const showNewDashboard = await fanion.activeForRequest('new-dashboard', { auth })

    if (showNewDashboard) {
      return response.ok({ message: 'New dashboard!' })
    }

    return response.ok({ message: 'Classic dashboard' })
  }
}
```

### Using Middleware

```typescript
// routes/web.ts
import router from '@adonisjs/core/services/router'
import { featureFlag } from '@fanion/adonisjs'

// Protect entire route
router.get('/beta', [featureFlag('beta-features')]).use(async ({ response }) => {
  return response.ok({ message: 'Beta feature accessed!' })
})

// Redirect when disabled
router.get('/new-ui', [featureFlagWithRedirect('new-ui', '/old-ui')]).use(async ({ response }) => {
  return response.ok({ message: 'New UI!' })
})
```

### Using Decorators

```typescript
import { requireFeature } from '@fanion/adonisjs'

export default class AdminController {
  @requireFeature('admin-panel')
  async index({ response }: HttpContext) {
    return response.ok({ message: 'Admin panel' })
  }

  @requireFeature('super-admin', {
    onDisabled: 'redirect',
    redirectTo: '/dashboard',
  })
  async users({ response }: HttpContext) {
    return response.ok({ users: [] })
  }
}
```

## Configuration

### Basic Configuration

```typescript
// config/fanion.ts
import { defineConfig } from '@fanion/adonisjs/types'
import env from '#start/env'

export default defineConfig({
  // Enable debug logging
  debug: env.get('NODE_ENV') === 'development',

  // Auto-initialize storage on app start
  autoInit: true,

  // Default context provider
  defaultContextProvider: () => ({
    environment: env.get('NODE_ENV'),
    appVersion: env.get('APP_VERSION', '1.0.0'),
  }),
})
```

### Database Storage

```typescript
// config/fanion.ts
import { defineConfig } from '@fanion/adonisjs/types'
import db from '@adonisjs/lucid/services/db'

export default defineConfig({
  storageDriver: {
    type: 'knex',
    config: {
      connection: db.connection(),
      tableName: 'feature_flags',
      featureNameColumn: 'feature_name',
      valueColumn: 'value',
    },
  },
})
```

### Feature Flag Definitions

```typescript
// config/fanion.ts
export default defineConfig({
  features: [
    // Simple boolean flag (stored in database)
    {
      name: 'maintenance-mode',
      description: 'Enable maintenance mode',
      store: true,
      defaultValue: false,
    },

    // User-based flag
    {
      name: 'premium-features',
      description: 'Enable premium features',
      check: (context) => {
        return context.user?.plan === 'premium' && context.user?.verified
      },
    },

    // Percentage-based rollout
    {
      name: 'new-feature',
      description: 'Roll out new feature to 25% of users',
      check: (context) => {
        const userId = context.user?.id || 0
        return userId % 100 < 25
      },
    },

    // Environment-based flag
    {
      name: 'debug-mode',
      description: 'Enable debug mode in development',
      check: () => process.env.NODE_ENV === 'development',
    },
  ],
})
```

## Advanced Usage

### A/B Testing

```typescript
import { ABTesting } from '@fanion/adonisjs'

// In config/fanion.ts
export default defineConfig({
  features: [
    {
      name: 'checkout-variant-a',
      description: 'A/B test for checkout flow - Variant A',
      check: ABTesting.createABTest('checkout', 50, (ctx) => ctx.user?.id || 0),
    },
  ],
})

// In your controller
export default class CheckoutController {
  @inject()
  async show({ response }: HttpContext, fanion: FanionService) {
    const showVariantA = await fanion.active('checkout-variant-a', { user: auth.user })

    return response.ok({
      variant: showVariantA ? 'A' : 'B',
      checkoutFlow: showVariantA ? 'simplified' : 'standard',
    })
  }
}
```

### Custom Context

```typescript
// Create custom context for feature evaluation
import { createFeatureContext } from '@fanion/adonisjs'

export default class ApiController {
  @inject()
  async data({ request, auth }: HttpContext, fanion: FanionService) {
    const context = createFeatureContext(
      { auth },
      {
        apiVersion: request.header('api-version'),
        clientType: request.header('client-type'),
        country: request.header('cf-ipcountry'), // Cloudflare country header
      }
    )

    const features = await fanion.activeMany(
      ['enhanced-api', 'geo-restrictions', 'rate-limiting'],
      context
    )

    return response.ok({ features })
  }
}
```

### Environment-Based Flags

```typescript
import { EnvironmentFlags } from '@fanion/adonisjs'

export default defineConfig({
  features: [
    {
      name: 'dev-tools',
      check: EnvironmentFlags.developmentOnly(),
    },
    {
      name: 'analytics',
      check: EnvironmentFlags.productionOnly(),
    },
    {
      name: 'staging-banner',
      check: EnvironmentFlags.createEnvironmentFlag(['staging', 'development']),
    },
  ],
})
```

### Multiple Flag Checks

```typescript
export default class DashboardController {
  @inject()
  async index({ auth }: HttpContext, fanion: FanionService) {
    const flags = await fanion.activeMany(
      ['new-dashboard', 'advanced-analytics', 'export-feature', 'real-time-updates'],
      { user: auth.user }
    )

    return response.ok({
      dashboard: {
        showNewDesign: flags['new-dashboard'],
        showAnalytics: flags['advanced-analytics'],
        allowExport: flags['export-feature'],
        realTimeUpdates: flags['real-time-updates'],
      },
    })
  }
}
```

## Middleware Options

### Basic Middleware

```typescript
import { featureFlag, featureFlagWithRedirect, featureFlagWithHandler } from '@fanion/adonisjs'

// Simple abort on disabled
router.get('/feature', [featureFlag('my-feature')])

// Redirect when disabled
router.get('/feature', [featureFlagWithRedirect('my-feature', '/coming-soon')])

// Custom handler when disabled
router.get('/feature', [
  featureFlagWithHandler('my-feature', ({ response }) => {
    return response.status(503).json({ message: 'Feature temporarily unavailable' })
  }),
])
```

### Advanced Middleware

```typescript
import { createFanionMiddleware } from '@fanion/adonisjs'

// Custom middleware with context provider
const betaMiddleware = createFanionMiddleware({
  flag: 'beta-features',
  contextProvider: async ({ auth, request }) => ({
    user: auth.user,
    userAgent: request.header('user-agent'),
    isMobile: request.header('user-agent')?.includes('Mobile'),
  }),
  onDisabled: 'custom',
  customHandler: ({ response }) => {
    return response.status(404).json({
      error: 'Feature not found',
      message: 'This feature is not available in your current plan',
    })
  },
})

router.get('/beta', [betaMiddleware])
```

## Helpers and Utilities

### Global Helpers

```typescript
import { isFeatureActive, getUserFeatures, ifFeatureActive } from '@fanion/adonisjs'

// Check feature globally
const isEnabled = await isFeatureActive('my-feature')

// Get all features for a user
const userFeatures = await getUserFeatures(user, ['feature1', 'feature2'])

// Conditional execution
await ifFeatureActive('email-notifications', async () => {
  await sendWelcomeEmail(user)
})
```

### View Helpers

```typescript
// In a service provider or preloader
import { ViewHelpers } from '@fanion/adonisjs'

export default class AppProvider {
  async boot() {
    const fanion = await this.app.container.make('fanion')
    const view = await this.app.container.make('view')

    // Add global view helpers
    view.global(ViewHelpers.createViewGlobals(fanion))
  }
}
```

```edge
{{-- In your Edge templates --}}
@if(await isFeatureActive('new-ui'))
  <div class="new-ui-component">
    <!-- New UI content -->
  </div>
@else
  <div class="legacy-ui-component">
    <!-- Legacy UI content -->
  </div>
@end
```

## Database Schema

When using database storage, the following table structure is created:

```sql
CREATE TABLE feature_flags (
  feature_name VARCHAR PRIMARY KEY,
  value BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

You can customize the table name and column names in the configuration:

```typescript
export default defineConfig({
  storageDriver: {
    type: 'knex',
    config: {
      connection: db.connection(),
      tableName: 'app_feature_flags',
      featureNameColumn: 'flag_name',
      valueColumn: 'is_enabled',
    },
  },
})
```

## Best Practices

### 1. Use Descriptive Names

```typescript
// Good
'user-profile-redesign'
'checkout-express-shipping'
'admin-advanced-analytics'

// Avoid
'flag1'
'test'
'new-feature'
```

### 2. Document Your Flags

```typescript
export default defineConfig({
  features: [
    {
      name: 'payment-method-apple-pay',
      description: 'Enable Apple Pay as payment method in checkout',
      check: (context) => {
        // Only enable for iOS users
        return context.userAgent?.includes('iPhone') || context.userAgent?.includes('iPad')
      },
    },
  ],
})
```

### 3. Use Kill Switches for Risky Features

```typescript
// Store critical features in database for quick toggles
{
  name: 'payment-processing',
  description: 'Kill switch for payment processing',
  store: true,
  defaultValue: true,
}
```

### 4. Implement Gradual Rollouts

```typescript
{
  name: 'new-search-algorithm',
  description: 'Gradual rollout of new search algorithm',
  check: (context) => {
    const userId = context.user?.id || 0
    const rolloutPercentage = 10 // Start with 10%
    return (userId % 100) < rolloutPercentage
  },
}
```

### 5. Handle Errors Gracefully

```typescript
export default class FeatureController {
  @inject()
  async show({ response }: HttpContext, fanion: FanionService) {
    try {
      const isActive = await fanion.active('experimental-feature')
      // Use feature
    } catch (error) {
      // Log error and fall back to safe default
      console.error('Feature flag error:', error)
      // Provide fallback behavior
    }
  }
}
```

## Testing

### Testing Feature Flags

```typescript
// tests/functional/feature_flags.spec.ts
import { test } from '@japa/runner'
import { FanionServiceImpl } from '@fanion/adonisjs'

test.group('Feature Flags', () => {
  test('should enable premium features for premium users', async ({ assert }) => {
    const fanion = new FanionServiceImpl()

    fanion.define('premium-features', (context) => {
      return context.user?.plan === 'premium'
    })

    const result = await fanion.active('premium-features', {
      user: { plan: 'premium' },
    })

    assert.isTrue(result)
  })
})
```

### Testing with Middleware

```typescript
test('should protect routes with feature flags', async ({ client }) => {
  const response = await client.get('/beta-feature')

  // Should return 404 if feature is disabled
  response.assertStatus(404)
})
```

## Migration Guide

### From Manual Feature Flags

If you're currently using manual feature flag implementations:

```typescript
// Before
if (process.env.ENABLE_NEW_FEATURE === 'true') {
  // Feature logic
}

// After
if (await fanion.active('new-feature')) {
  // Feature logic
}
```

### From Other Feature Flag Libraries

Most feature flag libraries can be migrated by:

1. Defining your existing flags in `config/fanion.ts`
2. Replacing flag checks with `fanion.active()`
3. Updating middleware to use Fanion middleware
4. Migrating stored flags to your database

## Troubleshooting

### Common Issues

**Feature flag not found error**

```
FeatureNotExistsError: Feature flag 'my-feature' is not defined
```

Solution: Make sure the feature is defined in your configuration or via `fanion.define()`.

**Storage provider not initialized**

```
Error: No store provider defined
```

Solution: Configure a storage driver in your configuration or set `autoInit: true`.

**Middleware not working**

```
Error: Binding not found: fanion
```

Solution: Make sure the FanionProvider is registered in your `adonisrc.ts` providers array.

### Debug Mode

Enable debug mode to see detailed logging:

```typescript
export default defineConfig({
  debug: true,
})
```

This will log all feature flag evaluations to help with debugging.

## API Reference

### FanionService

- `define<T>(name: string, check?: (context: T) => boolean | Promise<boolean>): void`
- `defineAndStore(name: string, defaultValue?: boolean): Promise<void>`
- `active<T>(name: string, context?: T): Promise<boolean>`
- `activeForRequest(name: string, ctx: HttpContext, additionalContext?: any): Promise<boolean>`
- `activeMany<T>(flags: string[], context?: T): Promise<Record<string, boolean>>`
- `getDefinedFlags(): string[]`

### Middleware

- `featureFlag(flagName: string, onDisabled?: 'abort' | 'next')`
- `featureFlagWithRedirect(flagName: string, redirectTo: string)`
- `featureFlagWithHandler(flagName: string, customHandler: Function)`
- `createFanionMiddleware(options: FanionMiddlewareOptions)`

### Helpers

- `isFeatureActive<T>(flagName: string, context?: T): Promise<boolean>`
- `isFeatureActiveForRequest(flagName: string, ctx: HttpContext, additionalContext?: any): Promise<boolean>`
- `getUserFeatures(user: any, flagNames?: string[]): Promise<Record<string, boolean>>`
- `ifFeatureActive<T>(flagName: string, callback: Function, context?: T): Promise<any>`
- `requireFeature(flagName: string, options?: object): MethodDecorator`

### Utilities

- `ABTesting.createABTest(testName: string, percentage: number, identifier?: Function)`
- `ABTesting.percentageRollout(identifier: number | string, percentage: number): boolean`
- `EnvironmentFlags.developmentOnly(): () => boolean`
- `EnvironmentFlags.productionOnly(): () => boolean`
- `EnvironmentFlags.createEnvironmentFlag(environments: string[]): () => boolean`

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

MIT © [Maxence Guyonvarho](mailto:contact@mgvdev.io)

## Related

- [Fanion Core Library](https://github.com/mgvdev/fanion) - The core feature flagging library
- [AdonisJS](https://adonisjs.com/) - The Node.js framework this adapter is built for

---

Made with ❤️ by [Maxence Guyonvarho](https://github.com/maxguyonvarho)
