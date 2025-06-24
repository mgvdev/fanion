# Fanion 🏁

> A lightweight, flexible feature flagging library for Node.js applications

Fanion is a modern feature flagging library that allows you to control feature rollouts, conduct A/B tests, and manage application behavior dynamically. Built with TypeScript and designed for simplicity and performance.

## Features

- 🚀 **Lightweight & Fast** - Minimal overhead with maximum performance
- 🔧 **TypeScript First** - Full type safety and IntelliSense support
- 🏪 **Pluggable Storage** - Memory, database, or custom storage providers
- 🎯 **Context-Aware** - Dynamic feature evaluation based on user context
- 🔄 **Async Support** - Built for modern async/await patterns
- 📦 **Zero Dependencies** - No external dependencies in core package

## Quick Start

### Installation

```bash
npm install fanion
# or
yarn add fanion
# or
pnpm add fanion
```

### Basic Usage

```typescript
import { featureManager } from 'fanion';

// Create a feature manager instance
const features = featureManager();

// Define a simple feature flag
features.define('new-dashboard', () => true);

// Check if feature is active
const isActive = await features.active('new-dashboard');
console.log(isActive); // true
```

### Context-Based Feature Flags

```typescript
// Define a feature flag with user context
features.define('premium-features', (context: { user: { plan: string } }) => {
  return context.user.plan === 'premium';
});

// Check feature with context
const hasAccess = await features.active('premium-features', {
  user: { plan: 'premium' }
});
```

### Using Storage Providers

```typescript
import { featureManager, createInMemoryDriver } from 'fanion';

// Create feature manager with storage
const features = featureManager({
  store: createInMemoryDriver()
});

// Define and store a feature flag
features.defineAndStore('beta-feature', true);

// Feature flags stored in the provider are automatically retrieved
const isEnabled = await features.active('beta-feature');
```

## API Reference

### FeatureManager

The main class for managing feature flags.

#### `define<T>(flagName: string, check?: (context: T) => boolean | Promise<boolean>)`

Define a feature flag with an optional check function.

```typescript
// Simple flag (always true when no check function provided)
features.define('simple-flag');

// Flag with synchronous check
features.define('admin-feature', (ctx: { isAdmin: boolean }) => ctx.isAdmin);

// Flag with asynchronous check
features.define('database-feature', async (ctx) => {
  return await checkDatabaseFeature(ctx.userId);
});
```

#### `defineAndStore(flagName: string, defaultValue: boolean = true)`

Define a feature flag and store it in the configured storage provider.

```typescript
features.defineAndStore('new-ui', false);
```

#### `active<T>(flagName: string, context?: T): Promise<boolean>`

Check if a feature flag is active for the given context.

```typescript
const isActive = await features.active('feature-name');
const isActiveWithContext = await features.active('feature-name', { userId: 123 });
```

### Storage Providers

#### In-Memory Driver

```typescript
import { createInMemoryDriver } from 'fanion';

const memoryStore = createInMemoryDriver();
const features = featureManager({ store: memoryStore });
```

#### Custom Storage Provider

Implement the `FeatureStorageProvider` interface:

```typescript
interface FeatureStorageProvider {
  set(flag: string, value: boolean): Promise<void>;
  get(flag: string): Promise<boolean | undefined>;
  delete(featureName: string): Promise<void>;
}

class RedisStorage implements FeatureStorageProvider {
  async set(flag: string, value: boolean): Promise<void> {
    // Implement Redis storage
  }

  async get(flag: string): Promise<boolean | undefined> {
    // Implement Redis retrieval
  }

  async delete(featureName: string): Promise<void> {
    // Implement Redis deletion
  }
}
```

### Utilities

#### `generateFeatureName(context: string, flag: string, subFlag?: string)`

Generate consistent feature flag names with namespacing.

```typescript
import { generateFeatureName } from 'fanion';

const flagName = generateFeatureName('auth', 'oauth', 'google');
// Returns: "auth:oauth.google"
```

## Advanced Usage

### A/B Testing

```typescript
features.define('homepage-variant', (context: { userId: number }) => {
  // Simple hash-based A/B test
  return context.userId % 2 === 0;
});

const showVariantA = await features.active('homepage-variant', { userId: 123 });
```

### Gradual Rollouts

```typescript
features.define('new-feature', (context: { userId: number }) => {
  // Roll out to 20% of users
  return (context.userId % 100) < 20;
});
```

### Environment-Based Flags

```typescript
features.define('debug-mode', () => {
  return process.env.NODE_ENV === 'development';
});
```

### Complex Business Logic

```typescript
features.define('enterprise-features', async (context: {
  user: { id: number; plan: string; createdAt: Date }
}) => {
  const { user } = context;

  // Multiple conditions
  if (user.plan !== 'enterprise') return false;

  // Check account age
  const accountAge = Date.now() - user.createdAt.getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  return accountAge > thirtyDays;
});
```

## Error Handling

Fanion provides specific error types for better error handling:

```typescript
import { FeatureNotExistsError } from 'fanion';

try {
  await features.active('non-existent-flag');
} catch (error) {
  if (error instanceof FeatureNotExistsError) {
    console.log('Feature flag not found');
  }
}
```

## Best Practices

### 1. Use Descriptive Names
```typescript
// Good
features.define('checkout-express-shipping');

// Avoid
features.define('flag1');
```

### 2. Implement Fallbacks
```typescript
features.define('external-api-feature', async (context) => {
  try {
    return await checkExternalAPI(context);
  } catch {
    // Fallback to safe default
    return false;
  }
});
```

### 3. Type Your Contexts
```typescript
interface UserContext {
  userId: number;
  plan: 'free' | 'premium' | 'enterprise';
  features: string[];
}

features.define<{ user: UserContext }>('premium-dashboard', (context) => {
  return context.user.plan !== 'free';
});
```

### 4. Keep Checks Simple
```typescript
// Good - simple and fast
features.define('new-ui', (ctx: { version: string }) => {
  return ctx.version >= '2.0.0';
});

// Avoid - complex logic that might slow down requests
features.define('complex-feature', async (ctx) => {
  // Avoid heavy database queries or API calls
  const result = await heavyDatabaseQuery(ctx);
  return processComplexLogic(result);
});
```

## Framework Integration

### Express.js

```typescript
import express from 'express';
import { featureManager } from 'fanion';

const app = express();
const features = featureManager();

features.define('rate-limiting', (ctx: { ip: string }) => {
  // Enable rate limiting for specific IPs
  return ctx.ip !== '127.0.0.1';
});

app.use(async (req, res, next) => {
  const shouldRateLimit = await features.active('rate-limiting', {
    ip: req.ip
  });

  if (shouldRateLimit) {
    // Apply rate limiting middleware
  }

  next();
});
```

### Next.js

```typescript
// lib/features.ts
import { featureManager } from 'fanion';

export const features = featureManager();

features.define('beta-features', (ctx: { user?: { isBetaTester: boolean } }) => {
  return ctx.user?.isBetaTester ?? false;
});

// pages/dashboard.tsx
import { features } from '../lib/features';

export async function getServerSideProps(context) {
  const showBetaFeatures = await features.active('beta-features', {
    user: context.user
  });

  return {
    props: { showBetaFeatures }
  };
}
```

## Performance Considerations

- Feature checks are designed to be fast and lightweight
- Use in-memory storage for high-performance scenarios
- Implement caching for database-backed storage providers
- Consider the frequency of feature flag evaluations in hot code paths

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Maxence Guyonvarho](mailto:contact@mgvdev.io)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes.

---

Made with ❤️ by [Maxence Guyonvarho](https://github.com/maxguyonvarho)
