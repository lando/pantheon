# Pantheon MySQL 8.4 (local only)

This fixture starts the real Pantheon recipe using `database.type: mysql` and
`database.version: 8.4` from `pantheon.yml`, with PHP 8.4. Fake site metadata
means no Pantheon account, machine token, or remote site is needed. Cache, edge,
and search services are disabled. No pull/push command contacts Pantheon.

Run commands from this directory after installing this checkout's npm dependencies.
Install the MySQL service plugin explicitly with `lando plugin-add @lando/mysql@1.6.0`
(or `lando setup` with `setup.plugins.@lando/mysql=1.6.0`). It is intentionally a
CI/setup prerequisite, not an extra Pantheon production dependency. The Landofile
loads Pantheon and MariaDB from this checkout, while MySQL comes from that explicit
installation. CI installs it even though `setup.skipCommonPlugins=true`.

Verified locally with MySQL plugin 1.6.0 and core 3.26.9, which omits the unset
`MYSQL_AUTHENTICATION_PLUGIN` variable when writing Compose YAML. The [upstream fix](https://github.com/lando/mysql/commit/09954c0925e2c63b7cc84fcad8595a02cfa31dcd)
makes that omission explicit in the service plugin. Both stable/edge CI cells
are configured below; this local run does not establish their CI results. Do not
substitute a custom database image, Compose authentication overrides, or a stale
externally installed service plugin.

Execute just this fixture with `leia examples/pantheon-mysql84/README.md
-c 'Destroy tests' --shell bash --stdin` from the repository root.
The teardown affects only this app; it deliberately never calls `lando poweroff`.

## Start up tests

```bash
# Should start the Pantheon MySQL 8.4 recipe without remote credentials
lando start
```

## Verification commands

```bash
# Should use the Pantheon PHP 8.4 appserver
lando php -v | grep 'PHP 8.4'

# Should query the running MySQL 8.4 server and its Pantheon defaults via PDO
lando php verify.php server

# Should create an InnoDB table with inherited utf8mb4 collation and two Unicode rows
lando php verify.php seed

# Should dump and restore both Unicode rows through the local pull/push client helper
lando exec appserver -- bash /app/verify-local-sync.sh

# Should export and import real rows through the recipe db-export and db-import tooling
bash verify-roundtrip.sh
```

The helper test probes the image's actual `mysql` and `mysqldump` binaries,
checks their capability-selected flags, and connects to **database** as Pantheon's
non-root user. It empties the table before import and verifies both Unicode values
afterwards. This covers the local TLS compatibility and `--no-tablespaces` path;
it does **not** claim end-to-end remote Pantheon pull/push coverage.

## Destroy tests

```bash
# Should destroy only this example's containers, network, and data
lando destroy -y

# Should remove any interrupted round-trip artifact
rm -f .mysql84-roundtrip.sql .mysql84-roundtrip.sql.gz
```
