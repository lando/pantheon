# Pantheon PHP Version Fallback Example

This example exists primarily to test the unsupported PHP image fallback
introduced for [#347](https://github.com/lando/pantheon/issues/347).

The bundled `pantheon.yml` sets `php_version: 7.1`. Generation 5 images
exist only for PHP 7.2+, so the plugin should warn and start against
`devwithlando/pantheon-appserver:7.1-4` instead of dying on Docker
`manifest unknown`.

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff

# Should start against the fallback 7.1-4 image
lando start
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should be running PHP 7.1
lando exec appserver -- php -v | grep "PHP 7.1"

# Should have started the 7.1-4 appserver image
docker ps --format '{{.Image}}' | grep 'devwithlando/pantheon-appserver:7.1-4'
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
