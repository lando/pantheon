# Pantheon PHP Version Warning Example

This example exists primarily to test the unsupported-PHP-version warning
introduced in [#347](https://github.com/lando/pantheon/pull/347).

The bundled `pantheon.yml` sets `php_version: "6.0"` — a PHP version that
does not exist (the PHP 6 project was abandoned in 2010, and Pantheon has
never published a `6.0` appserver image). The Lando Pantheon plugin should
warn the user clearly during `lando start` instead of leaving them to
decode the cryptic Docker `manifest unknown` error that follows.

`lando start` is *expected to fail* in this test — the appserver image
genuinely does not exist. We capture the start output to verify the
warning was emitted before that failure.

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff

# Should attempt to start and emit a warning to the terminal. The actual
# `lando start` is expected to fail because devwithlando/pantheon-appserver:6.0-*
# does not exist, so we tolerate the non-zero exit code with `|| true` and
# rely on the verification step below to assert the warning fired first.
lando start 2>&1 | tee /tmp/pantheon-php-warning-start.log || true
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should warn that no Docker images are available for PHP 6.0
grep "WARNING: No Docker images are available for PHP 6.0" /tmp/pantheon-php-warning-start.log

# Should explain that the appserver will fail to start
grep "appserver will fail to start" /tmp/pantheon-php-warning-start.log

# Should advise updating php_version in the user's pantheon.yml
grep "Update php_version in your pantheon.yml" /tmp/pantheon-php-warning-start.log

# Should recommend a Pantheon-supported PHP version
grep "Pantheon-recommended version" /tmp/pantheon-php-warning-start.log

# Should NOT have a running appserver container (the 6.0 image doesn't exist)
docker ps --filter label=com.docker.compose.project=pantheonphpwarning --format '{{.Image}}' | grep "pantheon-appserver" || echo $? | grep 1
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed cleanly even though start failed
lando destroy -y || true
lando poweroff

# Should clean up the start log
rm -f /tmp/pantheon-php-warning-start.log
```
