# Fanion 🏁

> A lightweight, flexible feature flagging library for Node.js applications

![banner](https://repository-images.githubusercontent.com/1007337927/4c50e881-0935-4d0b-bb39-0a8a87a57ec6)

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

For database support, also install the appropriate database driver:

```bash
# For SQL databases (SQLite, PostgreSQL, MySQL)
npm install knex sqlite3  # or pg, mysql2

# For DynamoDB
npm install @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb
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

### Using Database Storage

```typescript
import { featureManagerWithDatabase, createKnexDatabaseDriver } from 'fanion';
import knex from 'knex';

// Create database connection
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './features.db'
  },
  useNullAsDefault: true
});

// Create feature manager with database storage
const features = await featureManagerWithDatabase({
  store: createKnexDatabaseDriver({
    connection: db,
    tableName: 'feature_flags', // optional, defaults to 'feature_flags'
    featureNameColumn: 'feature_name', // optional, defaults to 'feature_name'
    valueColumn: 'value' // optional, defaults to 'value'
  })
});

// The database table is automatically created
// Feature flags are now persisted in the database
features.defineAndStore('persistent-feature', true);
```

### Using DynamoDB Storage

```typescript
import { featureManagerWithDatabase, createDynamoDBDatabaseDriver } from 'fanion';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Create DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: 'us-east-1',
  // Add other configuration as needed (credentials, endpoint, etc.)
});

// Create feature manager with DynamoDB storage
const features = await featureManagerWithDatabase({
  store: createDynamoDBDatabaseDriver({
    client: dynamoClient,
    tableName: 'feature_flags', // optional, defaults to 'feature_flags'
    featureNameAttribute: 'feature_name', // optional, defaults to 'feature_name'
    valueAttribute: 'value' // optional, defaults to 'value'
  })
});

// The DynamoDB table is automatically created with pay-per-request billing
// Feature flags are now persisted in DynamoDB
features.defineAndStore('persistent-feature', true);
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

### `defineAndStore(flagName: string, defaultValue: boolean = true)`

Define a feature flag and store it in the configured storage provider.

```typescript
features.defineAndStore('new-ui', false);
```

### `featureManagerWithDatabase(config: { store: FeatureStorageProvider })`

Create a feature manager instance with database initialization. This function automatically initializes the database connection and creates necessary tables.

```typescript
const features = await featureManagerWithDatabase({
  store: createKnexDatabaseDriver({ connection: db })
});
```

### `initStore(): Promise<void>`

Initialize the storage provider (useful for database connections). This is called automatically when using `featureManagerWithDatabase()`.

```typescript
const features = featureManager({ store: dbDriver });
await features.initStore(); // Initialize database tables
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

#### SQL Database Driver (Knex)

The Knex database driver supports all databases that Knex supports (PostgreSQL, MySQL, SQLite, etc.).

```typescript
import { createKnexDatabaseDriver, featureManagerWithDatabase, KnexDatabaseDriver } from 'fanion';
import knex from 'knex';

// Setup database connection
const db = knex({
  client: 'postgresql', // or 'mysql', 'sqlite3', etc.
  connection: {
    host: 'localhost',
    user: 'username',
    password: 'password',
    database: 'myapp'
  }
});

// Create database driver with custom configuration
const dbDriver = createKnexDatabaseDriver({
  connection: db,
  tableName: 'my_feature_flags',       // defaults to 'feature_flags'
  featureNameColumn: 'flag_name',      // defaults to 'feature_name'
  valueColumn: 'is_enabled'            // defaults to 'value'
});

// Initialize feature manager with database
const features = await featureManagerWithDatabase({
  store: dbDriver
});
```

**Configuration Options:**
- `connection`: Knex database connection instance (required)
- `tableName`: Name of the database table (optional, defaults to 'feature_flags')
- `featureNameColumn`: Name of the feature name column (optional, defaults to 'feature_name')
- `valueColumn`: Name of the value column (optional, defaults to 'value')

#### DynamoDB Driver

The DynamoDB driver uses AWS SDK v3 to connect to Amazon DynamoDB.

```typescript
import { createDynamoDBDatabaseDriver, featureManagerWithDatabase } from 'fanion';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Setup DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // For local development with DynamoDB Local
  // endpoint: 'http://localhost:8000',
});

// Create DynamoDB driver with custom configuration
const dynamoDriver = createDynamoDBDatabaseDriver({
  client: dynamoClient,
  tableName: 'my_feature_flags',        // defaults to 'feature_flags'
  featureNameAttribute: 'flag_name',    // defaults to 'feature_name'
  valueAttribute: 'is_enabled'          // defaults to 'value'
});

// Initialize feature manager with DynamoDB
const features = await featureManagerWithDatabase({
  store: dynamoDriver
});
```

**Configuration Options:**
- `client`: DynamoDB client instance from AWS SDK v3 (required)
- `tableName`: Name of the DynamoDB table (optional, defaults to 'feature_flags')
- `featureNameAttribute`: Name of the partition key attribute (optional, defaults to 'feature_name')
- `valueAttribute`: Name of the value attribute (optional, defaults to 'value')

**DynamoDB Table Structure:**
The driver automatically creates a table with:
- Partition key: `feature_name` (or custom attribute name)
- Pay-per-request billing mode
- No sort key (simple key-value storage)

#### Custom Storage Provider

Implement the `FeatureStorageProvider` interface:

```typescript
interface FeatureStorageProvider {
  set(flag: string, value: boolean): Promise<void>;
  get(flag: string): Promise<boolean | undefined>;
  delete(featureName: string): Promise<void>;
  initStore?(): Promise<void>; // Optional initialization method
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

  async initStore(): Promise<void> {
    // Optional: Initialize Redis connection
  }
}
```

For database providers, implement the `DatabaseStorageProvider` interface:

```typescript
import { DatabaseStorageProvider } from 'fanion';

interface DatabaseStorageProvider extends FeatureStorageProvider {
  createTableIfNotExists(): Promise<void>;
  isDatabaseDriver(): boolean;
  initStore(): Promise<void>;
}

class CustomDatabaseDriver implements DatabaseStorageProvider {
  async set(flag: string, value: boolean): Promise<void> {
    // Implement database upsert
  }

  async get(flag: string): Promise<boolean | undefined> {
    // Implement database retrieval
  }

  async delete(featureName: string): Promise<void> {
    // Implement database deletion
  }

  async createTableIfNotExists(): Promise<void> {
    // Create the feature flags table if it doesn't exist
  }

  isDatabaseDriver(): boolean {
    return true;
  }

  async initStore(): Promise<void> {
    await this.createTableIfNotExists();
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
import { featureManagerWithDatabase, createKnexDatabaseDriver } from 'fanion';
import knex from 'knex';

const db = knex({
  client: 'postgresql',
  connection: process.env.DATABASE_URL
});

export const features = await featureManagerWithDatabase({
  store: createKnexDatabaseDriver({ connection: db })
});

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

## Database Schemas

### SQL Databases (Knex Driver)

When using SQL database storage providers, Fanion automatically creates a table with the following structure:

```sql
CREATE TABLE feature_flags (
  feature_name VARCHAR PRIMARY KEY,
  value BOOLEAN NOT NULL
);
```

The table and column names are configurable through the driver configuration.

### DynamoDB

When using the DynamoDB driver, Fanion automatically creates a table with:
- **Partition Key**: `feature_name` (String)
- **Attributes**: `value` (Boolean)
- **Billing Mode**: Pay-per-request
- **No sort key**: Simple key-value storage

The table and attribute names are configurable through the driver configuration.

## Migration from In-Memory to Database Storage

If you're migrating from in-memory storage to database storage, here's how to transition smoothly:

```typescript
import { featureManager, featureManagerWithDatabase, createKnexDatabaseDriver, createDynamoDBDatabaseDriver } from 'fanion';

// Old in-memory setup
const oldFeatures = featureManager();
oldFeatures.define('feature-a', () => true);
oldFeatures.define('feature-b', (ctx) => ctx.user.isPremium);

// New SQL database setup
const sqlFeatures = await featureManagerWithDatabase({
  store: createKnexDatabaseDriver({ connection: db })
});

// Or new DynamoDB setup
const dynamoFeatures = await featureManagerWithDatabase({
  store: createDynamoDBDatabaseDriver({ client: dynamoClient })
});

// Migrate stored flags to database
sqlFeatures.defineAndStore('feature-a', true);
// Keep dynamic flags as code-based
sqlFeatures.define('feature-b', (ctx) => ctx.user.isPremium);
```

## Best Practices for Database Storage

### 1. Use Database Storage for Administrative Flags
```typescript
// Good: Use database for flags controlled by admins/operators
features.defineAndStore('maintenance-mode', false);
features.defineAndStore('new-ui-rollout', true);
```

### 2. Use Code-Based Flags for Complex Logic
```typescript
// Good: Keep complex logic in code
features.define('premium-features', (ctx) => {
  return ctx.user.plan === 'premium' && ctx.user.verified;
});
```

### 3. Connection Management

**For SQL Databases:**
```typescript
// Good: Reuse database connections
const db = knex({
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 } // Configure connection pooling
});

// Use the same connection for your app and feature flags
const features = await featureManagerWithDatabase({
  store: createKnexDatabaseDriver({ connection: db })
});
```

**For DynamoDB:**
```typescript
// Good: Reuse DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  // Configure connection settings, retries, etc.
  maxAttempts: 3,
});

// Use the same client for your app and feature flags
const features = await featureManagerWithDatabase({
  store: createDynamoDBDatabaseDriver({ client: dynamoClient })
});
```

### 4. Error Handling in Production
```typescript
// Good: Handle database errors gracefully
try {
  const isEnabled = await features.active('new-feature');
  if (isEnabled) {
    // Feature logic
  }
} catch (error) {
  // Log error and use safe default
  console.error('Feature flag error:', error);
  // Fall back to safe behavior
}
```

## Performance Considerations

- Feature checks are designed to be fast and lightweight
- Use in-memory storage for high-performance scenarios
- Database providers automatically create tables and handle upserts efficiently
- Consider connection pooling for SQL database-backed storage in production
- DynamoDB provides automatic scaling and low-latency access
- Implement caching for frequently accessed database-backed feature flags
- Consider the frequency of feature flag evaluations in hot code paths
- DynamoDB pay-per-request billing is cost-effective for most feature flag workloads

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Maxence Guyonvarho](mailto:contact@mgvdev.io)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes.

---

Made with ❤️ by [Maxence Guyonvarho](https://github.com/maxguyonvarho)
