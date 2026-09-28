---
title: Architecture
description: How the Lando Pantheon plugin turns pantheon.yml into a local Lando app.
---

# Architecture

This page is the contract between the plugin's modules. Update it when a
resolution step, service shape or sync flow changes.

## Decisions

**Mimic Pantheon on prebuilt images.** The recipe runs a
`devwithlando/pantheon-appserver` PHP-FPM image behind nginx, plus MariaDB,
Redis, Solr and Varnish. Images come from `dockerfiles/` via
`.github/workflows/build-pantheon-images.yml`. ARM hosts swap the database for
`pantheon-mariadb-arm` (upstream `mariadb` image) and the Solr tag for `3.6-3`.

**Keep resolution pure, I/O at the edges.** `lib/config.js` and
`lib/recipe.js` are pure functions over plain objects. `builders/pantheon.js`
does the only filesystem reads (yaml, `composer.json`), calls them in order and
hands the result to Lando's `_recipe` parent. `lib/utils.js` holds the
environment, cache/edge/index blocks and token helpers; `lib/client.js` talks
to the Pantheon API with native `fetch`; `scripts/` is mounted at `/helpers`.

## Plugin wiring

`index.js` runs once per Lando boot. It sanitizes `pantheon-auth` from logs and
listens on `cli-pull-answers`, `cli-push-answers` and `cli-switch-answers`. When
the app recipe is `pantheon` and the app meta cache holds a token, it calls
`api.auth()`. If the error message includes `failed with code 401` it removes
the token from the global `pantheon.tokens` cache, strips it from the app meta
cache, clears the tooling and task caches, deletes `data.options.auth` so the
user is prompted again, and prints the `badToken` art.

`app.js` runs per app. At `pre-init` priority 1 it sets
`app.pantheonTokenCache = 'pantheon.tokens'`, loads `app.pantheonTokens` from
the lando cache and `app.terminusTokens` from `~/.terminus/cache/tokens`. On
`post-pull`, `post-push` and `post-switch` it validates a new or changed
`answers.auth`, fetches the user email, writes the app meta cache and the
sorted global token list, and removes `<app>.tooling.cache`.

## Recipe resolution

`builders/pantheon.js` constructor, in order:

1. `_.merge({}, config, options, utils.getPantheonConfig([pantheon.upstream.yml, pantheon.yml]))`.
   `parsePantheonConfig` sets `php` (default `8.3`), `webroot` (`web` when
   `web_docroot`), `drush` (default `8`; warns and clamps below 8),
   `generation` (`4` for `php_runtime_generation: 1`, else `5`), `tikaVersion`
   and `frontendBuild`.
2. Read `_app._config.isArmed` and `composer.json` (`drush/drush` constraint).
3. `recipe.resolveOptions`: Solr tag (`3.6-3` on ARM, `8.8-4` / `9.10-1` for
   search 8/9), `database` (`pantheon-mariadb[-arm]:<database.version|10.3>`),
   `defaultFiles.vhosts` (`<framework>.conf.tpl`), then merges
   `utils.getPantheonCache`, `getPantheonEdge` and `getPantheonIndex` when
   `cache`/`edge`/`index` are on, and sets `proxy[proxyService]`
   (`appserver_nginx`, or `edge` when Varnish is on).
4. `recipe.getTooling`: `pull`, `push`, `switch`, `mysql`, `php`, `composer`,
   `db-export [file]`, `db-import <file>`, plus `drush`/`drupal`/`wp` from
   `utils.getPantheonTooling`. `LANDO_TERMINUS_TOKEN` is injected into the env
   of the three sync commands.
5. `recipe.getBuildSteps`: see [Lifecycle](./lifecycle.md).
6. Optional `frontend_build` services and tooling from `lib/frontend-build.js`.
7. `recipe.getServices`: `appserver` (`pantheon-php:<php>`) and `database`,
   merged under user `services`.
8. `recipe.getDrushUri` sets `DRUSH_OPTIONS_URI` from `drush_uri` or the proxy
   URL (with a non-standard port when `proxyLastPorts` says so).
9. `super(id, options)`.

## Service builders

| Builder | Extends | Notes |
|---|---|---|
| `pantheon-php` | `@lando/php` | image `devwithlando/pantheon-appserver:<php>-<generation>`, `via: nginx:1.25`, mounts `config/prepend.php` at `/srv/includes/prepend.php`, env from `utils.getPantheonEnvironment`, nginx type `pantheon-nginx` |
| `pantheon-nginx` | `@lando/php` nginx | thin subclass so the appserver's nginx sidecar is recipe-owned |
| `pantheon-mariadb` | `@lando/mariadb` | creds `pantheon`/`pantheon`/`pantheon` |
| `pantheon-mariadb-arm` | `_service` | raw `mariadb:<version>` image, `meUser: mysql`, healthcheck from `utils/get-mariadb-healthcheck.js` |
| `pantheon-redis` | `@lando/redis` | `cache` service, password `pantheon` |
| `pantheon-solr` | `@lando/solr` | `index` service, image `devwithlando/pantheon-index:<solrTag>`; Solr 3 listens on `449` behind `/helpers/add-cert.sh` |
| `pantheon-varnish` | `@lando/varnish` | `edge` service, `config/pantheon-v6.vcl`, backend `appserver_nginx` |
| `pantheon-node` | `@lando/node` | `frontend_build` sidecar |

## Pantheon parity

`utils.getPantheonEnvironment` sets what Pantheon exposes: `DB_*`, `CACHE_*`,
`PANTHEON_SITE`, `PANTHEON_SITE_NAME`, `PANTHEON_ENVIRONMENT=lando`,
`PANTHEON_INDEX_*`, `FRAMEWORK`, `FILEMOUNT`, `TERMINUS_*`, WordPress salts and
`PRESSFLOW_SETTINGS` / `BACKDROP_SETTINGS` (JSON from `getPantheonSettings`).
`config/php.ini` sets `auto_prepend_file = /srv/includes/prepend.php`, and
`config/prepend.php` turns those variables into `PANTHEON_*` PHP constants.

## Sync

`lib/pull.js`, `lib/push.js` and `lib/switch.js` export tooling tasks with
`service: appserver`, `level: app` and `cmd` of `/helpers/{pull,push,switch}.sh`.
They own the option schema (`--auth`, `--code`, `--database`, `--files`,
`--rsync`, `--message`, `--env`, `--no-db`, `--no-files`) and the interactive
prompts fed by `utils.getPantheonInquirerEnvs`; `lib/auth.js` decides whether
`--auth` is a token picker or a hidden password prompt. Pull also passes
`LANDO_DB_PULL_COMMAND*` and `LANDO_DB_USER_TABLE`.

The work happens in bash: `terminus` auth and env checks, git checkout/pull,
`mysqldump` piped through `pv` into local MariaDB, tarball plus `rsync` for
files. `switch.sh` stashes `.lando.yml` and re-uses `pull.sh --no-auth`. The
scripts source `${LANDO_LOG_HELPER:-/helpers/log.sh}` and call
`${PANTHEON_AUTH_SCRIPT:-/helpers/auth.sh}` / `${PANTHEON_PULL_SCRIPT:-/helpers/pull.sh}`
so tests can inject mocks.

## Testing

- Config and recipe: `config.spec.js`, `recipe.spec.js`, `drush-version.spec.js`,
  `frontend-build.spec.js`, `utils.spec.js`, `php.spec.js`, `mysql.spec.js`.
- Builder: `builder.spec.js` captures what `super()` receives via a `MockParent`.
- Sync tasks: `pull.spec.js`, `push.spec.js`, `switch.spec.js`, `auth.spec.js`,
  `inquirer-envs.spec.js`.
- Scripts: `scripts.spec.js` runs the bash under a mock `PATH` with
  `test/fixtures/{log.sh,mock-terminus.sh,mock-command.sh,mock-auth.sh,mock-pull.sh}`.
- API and events: `client.spec.js` (stubbed `global.fetch`), `index.spec.js` and
  `app.spec.js` (stubbed `require.cache`). Leia READMEs in `examples/` run in CI only.
