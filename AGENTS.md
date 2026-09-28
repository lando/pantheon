# AGENTS.md - Lando Pantheon Plugin

Guidance for AI coding agents working in this repository.

## Maintenance
- Keep this file up to date. If you identify a serious repo-specific gotcha that is likely to trip future agents, update this file in the same change.

## Project Overview

`@lando/pantheon` is a Lando v3 recipe plugin for Pantheon hosting. It builds a local stack that mimics Pantheon's and adds `pull`/`push`/`switch` tooling to sync code, database and files.

- **Language:** JavaScript (CommonJS, not ES modules)
- **Node Version:** >=20.0.0
- **Style Guide:** Google JavaScript Style Guide + `eslint-plugin-jsdoc` (eslint 9 flat config)
- **Testing:** Mocha + Chai (+ nyc coverage)

## Build/Lint/Test Commands

```bash
npm run lint              # eslint . --config eslint.config.js
npm run test:unit         # nyc + mocha test/**/*.spec.js
npm run test              # lint + unit tests
npm run docs:build        # VitePress build of docs/

# Single test file / pattern
npx mocha --timeout 5000 test/recipe.spec.js
npx mocha --timeout 5000 --grep "pattern" test/**/*.spec.js
```

`npm run test:leia` is CI-only. Do not run it locally (see Gotchas).

## Directory Structure

```
builders/         # Service builders (pantheon-*.js) and the recipe (pantheon.js)
config/           # Templates mounted into containers (.conf.tpl, .vcl, php.ini, prepend.php)
dockerfiles/      # Sources for devwithlando/pantheon-appserver and pantheon-index images
docs/             # VitePress docs (architecture.md, lifecycle.md, ...)
examples/         # Leia integration specs (README.md files are executable). See examples/AGENTS.md; remote landobot sites use master, not main
inits/            # `lando init --source pantheon`
lib/              # auth, client (fetch), config, recipe, pull/push/switch, utils, core-utils
scripts/          # Bash run inside the appserver as /helpers/*.sh
test/             # Unit tests (*.spec.js)
test/fixtures/    # Mock bash helpers for the script harness
utils/            # Small shared helpers (mariadb healthcheck)
.github/scripts/  # CI helper scripts (check-node-versions.js)
```

Key modules:
- `lib/config.js` - `parsePantheonConfig(docs)` (pure) and `getPantheonConfig(files)` (reads yaml). `lib/utils.js` re-exports `getPantheonConfig`.
- `lib/recipe.js` - pure recipe resolution: `resolveOptions`, `getTooling`, `getBuildSteps`, `getServices`, `getServiceConfig`, `getDrushUri`.
- `builders/pantheon.js` - thin constructor: read yaml/composer.json, call `lib/recipe.js`, `super(id, options)`.
- `lib/core-utils.js` - only `getDrush` and `getPhar`.
- `lib/client.js` - Pantheon API client on native `fetch` (no axios).

## Code Style Guidelines

### Strict Mode and Imports

```javascript
'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const {someFunc} = require('./lib/utils');
```

- `const` + `require()`; external/built-in modules first, then local.

### Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| Variables | camelCase | `siteInfo`, `configPath` |
| Constants | SCREAMING_SNAKE_CASE | `DRUSH_VERSION` |
| Functions | camelCase, `get`/`is` prefix | `getHash`, `isWordPressy` |
| Classes | PascalCase | `PantheonApiClient` |
| Files | kebab-case | `pantheon-mariadb.js` |

### Formatting (ESLint enforced)

- 2-space indent (rule off, but keep it), max line 140, single quotes, semicolons, `arrow-parens: as-needed`.
- `no-unused-vars` is an error. `indent` and `comma-dangle` are off.
- Ignores live in `eslint.config.js` (`coverage/`, `.nyc_output/`, `docs/.vitepress/{cache,dist}/`, `examples/*/drupal*/`, `examples/*/wordpress/`).

### JSDoc Requirements

`jsdoc/require-jsdoc` applies to `FunctionDeclaration` only; arrow functions do not need a block but get one when exported. `jsdoc/check-tag-names`, `check-param-names`, `check-types` and `valid-types` are errors.

- Use `@return`, never `@returns` (`tagNamePreference`).
- Lowercase primitive/object types: `{object}`, `{string}`, `{boolean}`, `{object[]}`. `{Array}`, `{Promise<object>}`, `{Function}` are fine.
- Param and return descriptions are optional.

```javascript
/**
 * Builds recipe tooling, including framework commands and the terminus token env.
 *
 * @param {object} options resolved recipe options
 * @param {Array} tokens sorted Pantheon and Terminus tokens
 * @return {object} tooling map
 */
const getTooling = (options, tokens) => { };
```

### Error Handling

`lib/client.js` throws a plain `Error` on non-2xx: `` `${method} request to ${path} failed with code ${status}: ${statusText}. The server responded with the message ${body}.` ``. `index.js` detects revoked tokens with `error.message.includes('failed with code 401')`.

### Lodash Usage

```javascript
_.get(options, 'search.version', '3')
_.merge({}, config, options)
```

### Module Exports

```javascript
module.exports = async (app, lando) => { };            // app.js
module.exports = class PantheonApiClient { };          // lib/client.js
module.exports = {name: 'pantheon', parent: '_recipe', config, builder: (parent, config) => class extends parent { }};
module.exports = {resolveOptions, getTooling};         // lib/recipe.js
exports.getPantheonConfig = require('./config').getPantheonConfig;
```

### Comment Conventions

```javascript
// Modules                    // Section headers
// @NOTE: explanation...      // Notes
// @TODO: task description    // TODOs
```

## Testing Conventions

`test/*.spec.js`, Mocha + Chai (`chai.should()` or `expect`). Layers:

- **Pure modules** (`recipe.spec.js`, `config.spec.js`, `pull/push/switch.spec.js`, `php.spec.js`, `mysql.spec.js`, `utils.spec.js`): call the exported functions with a `baseOptions()` object; no filesystem beyond temp dirs.
- **Builder characterization** (`builder.spec.js`): pass a `MockParent` whose constructor stores `(id, options)` into `recipe.builder(MockParent, recipe.config)`, write `pantheon.yml` into a `fs.mkdtempSync` dir, then assert on `options` handed to `super()`.
- **Bash harness** (`scripts.spec.js`): runs `scripts/{pull,push,switch}.sh` with `spawnSync('bash', ...)` under a mock `PATH`. Fixtures in `test/fixtures/`: `log.sh` (logger), `mock-terminus.sh`, `mock-command.sh` (mysql/mysqldump/pv/rsync/...), `mock-auth.sh`, `mock-pull.sh`. Injection env: `LANDO_LOG_HELPER`, `PANTHEON_AUTH_SCRIPT`, `PANTHEON_PULL_SCRIPT`, `MOCK_LOG`, `MOCK_TERMINUS_FAIL_ON`. A real `git` repo is created in the temp mount.
- **HTTP** (`client.spec.js`, `inquirer-envs.spec.js`): swap `global.fetch` in `beforeEach`, restore in `afterEach`.
- **Plugin glue** (`index.spec.js`, `app.spec.js`): replace `require.cache[clientPath].exports` with a stub class, `delete require.cache[modulePath]`, re-require; restore both in `afterEach`.

Always clean temp dirs (`fs.rmSync(dir, {recursive: true, force: true})`) and restored globals in `afterEach`. Coverage `nyc.include` is `builders/`, `inits/`, `lib/`, `utils/`.

## Key Dependencies

- `lodash`, `js-yaml`, `@lando/{mariadb,node,php,redis,solr,varnish}` (runtime)
- `eslint`, `@eslint/js`, `eslint-config-google`, `eslint-plugin-jsdoc`, `globals`, `@babel/eslint-parser`, `mocha`, `chai`, `nyc`, `yaml` (used by `.github/scripts/check-node-versions.js`), `vitepress`, `@lando/leia` (dev)

## Repo-Specific Gotchas

- **`examples/**/README.md` are executable Leia specs.** CI (`pr-pantheon-tests.yml`) runs them against real Pantheon sites with `PANTHEON_MACHINE_TOKEN`. `npm run test:leia` is CI-only; never run it locally.
- **`plugin.yml` sets `legacy: true`** so Lando autoscans `builders/`, `inits/`, `scripts/` etc. New builders need no registration, only the file.
- **`scripts/*.sh` run inside the container as `/helpers/*.sh`**, sourcing core's `/helpers/log.sh`. `push.sh` calls a bare `error` function that core's `log.sh` does not define (`lando_error` is the real helper). Pre-existing bug; `test/fixtures/log.sh` defines `error` to keep the harness honest. Don't fix it as a drive-by; document if you touch it.
- **`lib/config.js` uses `console.warn`** for the `drush_version < 8` warning (not the lando logger), so it prints during recipe resolution.
- **Docker images are prebuilt** by `.github/workflows/build-pantheon-images.yml` from `dockerfiles/<ver>-fpm` and `<ver>-solr`. Adding a PHP or Solr version means a new Dockerfile dir plus a matrix entry.
- **ARM hosts** (`_app._config.isArmed`) get `pantheon-mariadb-arm:<ver>` (upstream `mariadb` image) and Solr tag `3.6-3`; Search 8/9 override the Solr tag regardless.
- **Docs lint with the root config.** There is no `docs/.eslintrc.json`; `docs/.vitepress/config.mjs` must pass `npm run lint`.
- **`.lando.yml` at the repo root** is for docs work only.
- User-facing changes go in `CHANGELOG.md` under `## {{ UNRELEASED_VERSION }}`, past tense, one bullet each.
