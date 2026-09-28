---
title: Lifecycle
description: What happens when a Pantheon site starts under Lando.
---

# Lifecycle

1. **Load.** Lando merges the Landofile with the recipe config in
   `builders/pantheon.js`. `utils.getPantheonConfig` reads
   `pantheon.upstream.yml` then `pantheon.yml` (later wins) and normalizes
   `php_version`, `web_docroot`, `drush_version`, `php_runtime_generation` and
   `tika_version`. A `drush_version` below 8 warns and falls back to 8.
2. **Resolve.** `lib/recipe.js` turns those options into services, tooling and
   build steps, then hands them to Lando's `_recipe` parent. See
   [Architecture](./architecture.md).
3. **Build** (first start and `lando rebuild`), on `appserver`:
   - `build_root` (`build_as_root_internal`): your `build_root` steps, then
     `/helpers/pantheon.sh`, then the Tika 3 download when `tika_version: 3`.
   - `build` (`build_internal`): `composer install` first when `build_step` is
     set; framework tooling from `utils.getPantheonBuildSteps` (drush phar for
     Drush 8, `composer global require drush/drush:^N` above 8, `wp-cli.phar`
     for WordPress, Drupal Console for `drupal8`, backdrush for `backdrop`);
     your `build` steps; then `/helpers/auth.sh`.
   - `run_root` (`run_as_root_internal`): your `run_root` steps, then
     `/helpers/binding.sh`. These run on every start.
4. **Serve.** `pantheon-php` runs PHP-FPM behind `pantheon-nginx`. When `edge`
   is on, Varnish is the proxy target instead of `appserver_nginx`.

## Helper scripts

| Script | When | What it does |
|---|---|---|
| `pantheon.sh` | build, root | creates `/certs`, `/var/www/certs`, `/srv/bindings`; symlinks `/srv/bindings/lando` → `/var/www`, `/code` → `/app`; writes `/var/www/.wp-cli/config.yml` with `path: $LANDO_WEBROOT`; chowns `/var/www` to `www-data` |
| `auth.sh` | build, app user; also from `pull`/`push`/`switch` | args `AUTH SITE ENV` (defaults `LANDO_TERMINUS_TOKEN`, `PANTHEON_SITE`, `TERMINUS_ENV`); exits early if `terminus auth:whoami` already matches `TERMINUS_USER`; logs in with the machine token; verifies `terminus site:info`; fetches or refreshes `/var/www/certs/binding.pem` from the dev environment over SFTP |
| `binding.sh` | every start, root | if no `binding.pem`, symlinks Lando's `/certs/cert.pem` to it; links it into `/root/certs` and `/certs` for Windows FPM-as-root |

`auth.sh` does nothing when its token argument is empty (no init token), so a
fresh clone without `lando init` still starts.

## Tooling runtime

`lando pull`, `lando push` and `lando switch` are tooling tasks built by
`lib/pull.js`, `lib/push.js` and `lib/switch.js`:

1. Lando parses the JS option schema (`--auth`, `--code`, `--database`,
   `--files`, `--rsync`, `--message`, `--env`, `--no-db`, `--no-files`) and
   asks interactive questions. Environment lists come from
   `utils.getPantheonInquirerEnvs` (the API). `switch` hides `test` and `live`.
2. Options are passed through to `/helpers/pull.sh`, `/helpers/push.sh` or
   `/helpers/switch.sh` as flags. The task env carries `LANDO_TERMINUS_TOKEN`,
   and pull adds `LANDO_DB_PULL_COMMAND*` and `LANDO_DB_USER_TABLE`.
3. Bash calls `auth.sh`, then `terminus env:info` to validate each target.
   - `pull.sh`: `git checkout`/`git pull` (multidev branches fetch first),
     drops all local tables, `terminus env:wake`, streams `terminus remote:drush
     sql-dump` (or `remote:wp db export`, or a `mysqldump` fallback) through
     `pv` into `mysql`, checks for the users table, runs `wp search-replace`
     for WordPress, then downloads a files tarball and/or `rsync`s.
   - `push.sh`: refuses `test`/`live` (exit 3), switches the Pantheon
     connection mode to git if there are no uncommitted dashboard changes,
     commits with `--message`, `git push`, `mysqldump` to the remote connection,
     `rsync` files up.
   - `switch.sh`: stashes `.lando.yml`, runs `pull.sh --code=<env> --rsync
     --no-auth`, restores `.lando.yml` if the branch lacked one.

## Token lifecycle

1. `lando init --source pantheon` (`inits/pantheon.js`) validates the machine
   token against the API and stores `{token, email, date}` in the global
   `pantheon.tokens` cache and the app's `<name>.meta.cache`.
2. On every app load, `app.js` `pre-init` (priority 1) reads `pantheon.tokens`
   and `~/.terminus/cache/tokens`. `recipe.getTooling` sorts them
   (`utils.sortTokens`, newest per email) into the `--auth` picker, and puts the
   app's meta token into `LANDO_TERMINUS_TOKEN` for `pull`/`push`/`switch`.
3. Before those commands run, `index.js` listens on `cli-<command>-answers`
   and re-checks the cached token. A `failed with code 401` error scrubs it
   from both caches, clears the tooling cache and drops `--auth` so you are
   prompted for a new token.
4. After the command, `app.js` `post-<command>` saves a new or changed
   `answers.auth` back to both caches and resets `<app>.tooling.cache`.
