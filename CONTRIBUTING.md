# Contributing to Fanion 🏁

Thank you for your interest in contributing to Fanion! This guide will help you get started with the development environment and contribution process.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)
- [Getting Help](#getting-help)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **pnpm** (v8.0.0 or higher) - [Installation Guide](https://pnpm.io/installation)

You can verify your installations:

```bash
node --version  # Should be v18.0.0+
pnpm --version  # Should be v8.0.0+
```

## Development Setup

### 1. Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/fanion.git
cd fanion
```

### 2. Install Dependencies

Install all project dependencies using pnpm:

```bash
pnpm install
```

This will install dependencies for both the root workspace and all packages in the monorepo.

### 3. Verify Installation

Test that everything is working:

```bash
cd packages/fanion
pnpm test
```

You should see all tests passing:

```
Feature (tests/feature.spec.ts)
  ✔ define a feature flag
  ✔ define and test a simple feature flag
  ✔ define and test a feature flag with a context
  ✔ try to retreive an undefined feature flag
  ✔ retreive feature class from class
  ✔ retreive feature class from function

Provider (tests/provider.spec.ts)
  ✔ Should register a provider
  ✔ Should get a feature flag from a provider if not defined in the manager
  ✔ Should throw an error if the feature flag is not defined

generateFeatureName (tests/utils.spec.ts)
  ✔ should generate feature name from a context and flag
  ✔ Should generate a feature name from a context, flag and sub flag

PASSED
Tests: 11 passed (11)
```

## Project Structure

Fanion uses a monorepo structure with pnpm workspaces:

```
fanion/
├── packages/
│   └── fanion/                 # Main package
│       ├── src/
│       │   ├── drivers/        # Storage providers
│       │   │   └── memory.ts   # In-memory storage
│       │   ├── types/          # TypeScript interfaces
│       │   │   ├── feature_storage_provider.ts
│       │   │   ├── provider.ts
│       │   │   └── flag_actor.ts
│       │   ├── errors.ts       # Custom error classes
│       │   ├── feature.ts      # Main FeatureManager class
│       │   └── utils.ts        # Utility functions
│       ├── tests/              # Test files
│       │   ├── feature.spec.ts
│       │   ├── provider.spec.ts
│       │   └── utils.spec.ts
│       ├── bin/                # Test runner setup
│       ├── package.json
│       └── tsconfig.json
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # Workspace configuration
└── pnpm-lock.yaml             # Lock file
```

## Development Workflow

### 1. Create a Branch

Create a new branch for your feature or fix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-fix-name
```

### 2. Make Changes

- Follow the existing code style and patterns
- Add tests for new functionality
- Update documentation if needed
- Ensure your changes don't break existing functionality

### 3. Test Your Changes

Always test your changes thoroughly:

```bash
cd packages/fanion

# Run tests
pnpm test

# Run tests with coverage
pnpm run coverage

# Run linting
pnpm run lint
```

## Testing

Fanion uses [Japa](https://japa.dev/) as the testing framework.

### Running Tests

```bash
# Run all tests
cd packages/fanion
pnpm test

# Run tests with coverage report
pnpm run coverage

```

### Writing Tests

Tests are located in the `packages/fanion/tests/` directory. Follow these conventions:

1. **File naming**: `*.spec.ts`
2. **Test structure**: Use descriptive test names
3. **Grouping**: Group related tests using `test.group()`

Example test structure:

```typescript
import { test } from '@japa/runner';
import { FeatureManager } from '../src/feature.js';

test.group('Feature Name', () => {
  test('should do something specific', async ({ expect }) => {
    const manager = new FeatureManager();

    // Your test logic here
    expect(result).toBe(expectedValue);
  });
});
```

### Test Coverage

We aim for high test coverage. Current coverage targets:

- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >80%
- **Lines**: >90%

Check coverage with:

```bash
pnpm run coverage
```

## Code Quality

### Linting

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
cd packages/fanion

# Check for linting issues
pnpm run lint

# Auto-fix linting issues (when possible)
pnpm run lint --apply
```

### TypeScript

- All code must be written in TypeScript
- Strict type checking is enabled
- Use proper type annotations
- Avoid `any` types when possible

### Code Style Guidelines

1. **Naming Conventions**:
   - Use camelCase for variables and functions
   - Use PascalCase for classes and interfaces
   - Use kebab_case for file names
   - Use UPPER_SNAKE_CASE for constants

2. **Code Organization**:
   - Keep functions small and focused
   - Use meaningful variable and function names
   - Add JSDoc comments for public APIs
   - Organize imports: external modules first, then internal modules

3. **Error Handling**:
   - Use custom error classes when appropriate
   - Provide meaningful error messages
   - Handle async operations properly

### Example Code Style

```typescript
/**
 * Define a feature flag with optional check function
 */
export class FeatureManager {
  /**
   * Map to store feature flag check functions
   */
  protected featureMap = new Map<string, FeatureCheck | undefined>();

  /**
   * Define a feature flag
   *
   * @param flagName - The name of the feature flag
   * @param check - Optional callback function for dynamic evaluation
   */
  define<T>(
    flagName: string,
    check?: (context: T) => Promise<boolean> | boolean,
  ): void {
    this.featureMap.set(flagName, check);
  }
}
```

## Submitting Changes

### 1. Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Feature
git commit -m "feat: add new storage driver for Redis"

# Bug fix
git commit -m "fix: resolve memory leak in feature manager"

# Documentation
git commit -m "docs: update API documentation"

# Tests
git commit -m "test: add tests for async feature checks"

# Refactoring
git commit -m "refactor: simplify feature flag resolution logic"
```

### 2. Push Changes

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

1. Go to the GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill out the PR template with:
   - Clear description of changes
   - Link to related issues
   - Testing performed
   - Breaking changes (if any)

### 4. PR Review Process

- All PRs require at least one review
- Address review feedback promptly
- Keep PRs focused and reasonably sized
- Ensure CI checks pass

## Release Process

Releases are handled by maintainers. The process includes:

1. Version bump following [Semantic Versioning](https://semver.org/)
2. Update CHANGELOG.md
3. Create GitHub release
4. Publish to npm

## Getting Help

### Questions and Discussions

- **GitHub Discussions**: For general questions and community discussions
- **GitHub Issues**: For bug reports and feature requests
- **Discord/Slack**: [Add community links if available]

### Reporting Issues

When reporting issues, include:

1. **Environment**: Node.js version, pnpm version, OS
2. **Steps to reproduce**: Clear, step-by-step instructions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Code sample**: Minimal reproduction case

### Feature Requests

For feature requests:

1. Check existing issues first
2. Provide clear use case and rationale
3. Consider implementation approach
4. Be open to discussion and feedback

## Development Tips

### Useful Commands

```bash
# Install dependencies
pnpm install

# Run tests
cd packages/fanion && pnpm test

# Run linting
cd packages/fanion && pnpm run lint

# Generate coverage report
cd packages/fanion && pnpm run coverage

# Clean build artifacts
rm -rf packages/fanion/coverage
```

### IDE Setup

Recommended VS Code extensions:

- **TypeScript**: Built-in TypeScript support
- **Biome**: Official Biome extension
- **GitLens**: Enhanced Git capabilities
- **Thunder Client**: API testing (for integration tests)

### Debugging

For debugging tests:

```bash
# Add breakpoints in your code
# Run with Node.js debugger
node --inspect-brk --loader=ts-node/esm bin/test.ts
```

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## License

By contributing to Fanion, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Fanion! 🚀
