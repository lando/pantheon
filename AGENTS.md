# AGENTS.md - Lando Pantheon Plugin

This document provides guidance for AI coding agents working in this repository.

## Project Overview

This is `@lando/pantheon`, a Node.js Lando plugin that integrates with Pantheon hosting. It provides local development environments mimicking Pantheon's stack and commands to sync code, database, and files.

- **Language:** JavaScript (CommonJS, not ES modules)
- **Node Version:** >=20.0.0
- **Style Guide:** Google JavaScript Style Guide (via ESLint)
- **Testing:** Mocha + Chai

## Build/Lint/Test Commands

```bash
npm run lint              # Run linter
npm run test:unit         # Run all unit tests with coverage
npm run test              # Run lint + unit tests together
npm run test:leia         # Run integration tests (requires Lando)

# Run a single test file
npx mocha --timeout 5000 test/auth.spec.js

# Run tests matching a pattern
npx mocha --timeout 5000 --grep "pattern" test/**/*.spec.js
```

## Directory Structure

```
builders/   # Lando service builders (pantheon-*.js)
config/     # Configuration templates (.conf.tpl, .vcl, etc.)
lib/        # Core library code (auth, client, utils)
scripts/    # Shell scripts for containers
test/       # Unit tests (*.spec.js)
utils/      # Utility modules
```

## Code Style Guidelines

### Strict Mode and Imports

Every file must start with `'use strict';` followed by imports:

```javascript
'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const {someFunc} = require('./lib/utils');
```

- Use `const` with `require()` (CommonJS)
- External/built-in modules first, then local modules

### Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| Variables | camelCase | `siteInfo`, `configPath` |
| Constants | SCREAMING_SNAKE_CASE | `DRUSH_VERSION` |
| Functions | camelCase, `get`/`is` prefix | `getHash`, `isWordPressy` |
| Classes | PascalCase | `PantheonApiClient` |
| Files | kebab-case | `pantheon-mariadb.js` |

### Formatting (ESLint enforced)

- **Indentation:** 2 spaces
- **Max line length:** 140 characters
- **Quotes:** Single quotes
- **Semicolons:** Required
- **Arrow parens:** Omit when possible (`x => x`)

### JSDoc Requirements

Function declarations MUST have JSDoc comments:

```javascript
/**
 * Gets framework-specific tooling configuration
 * @param {string} framework - Framework type
 * @param {number} [drush=8] - Drush version
 * @return {Object} Tooling configuration
 */
const getTooling = (framework, drush = 8) => { };
```

### Error Handling

```javascript
try {
  await api.auth();
} catch (error) {
  throw (_.has(error, 'response.data')) ? new Error(error.response.data) : error;
}
```

### Lodash Usage

This codebase heavily uses Lodash. Prefer Lodash methods:

```javascript
_.get(options, 'search.version', '3')    // Safe property access
_.merge({}, config, options)              // Deep merge
_.has(err, 'response.data')               // Check property exists
```

### Module Exports

```javascript
module.exports = async (app, lando) => { };
module.exports = class PantheonApiClient { };
module.exports = {
  name: 'pantheon',
  builder: (parent, config) => class extends parent { },
};
exports.getPantheonConfig = () => { };
```

### Comment Conventions

```javascript
// Modules                    // Section headers
// @NOTE: explanation...      // Notes
// @TODO: task description    // TODOs
```

## Testing Conventions

Test files: `test/*.spec.js` using Mocha + Chai:

```javascript
'use strict';

const chai = require('chai');
chai.should();

describe('ModuleName', () => {
  describe('#methodName', () => {
    it('should do something expected', () => {
      result.should.equal(expected);
    });
  });
});
```

## Key Dependencies

- `lodash` - Utility functions (use extensively)
- `axios` - HTTP client for Pantheon API
- `js-yaml` - YAML parsing
- `@lando/*` - Lando service plugins

## Common Patterns

### Path Handling

```javascript
path.join(options.root, 'pantheon.yml')
path.resolve(__dirname, '..', 'config')
```

### Builder Pattern

```javascript
builder: (parent, config) => class LandoPantheon extends parent {
  constructor(id, options = {}) {
    options = _.merge({}, config, options, utils.getPantheonConfig());
    super(id, options);
  }
}
```
