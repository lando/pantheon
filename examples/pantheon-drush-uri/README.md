# Pantheon Drush URI Example

This example exists primarily to test the following documentation:

* [Pantheon Recipe - Drush URI Configuration](https://docs.lando.dev/plugins/pantheon/config.html#configuring-drush-uri)

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff

# Should start up successfully
lando start
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should have DRUSH_OPTIONS_URI set to the default proxy URL
lando exec appserver -- "env" | grep DRUSH_OPTIONS_URI | grep "https://lando-pantheon-drush-uri.lndo.site"
```

## Custom drush_uri test

Run the following commands to test custom drush_uri configuration.

```bash
# Should be able to set a custom drush_uri
cat > .lando.local.yml <<EOF
config:
  drush_uri: 'https://custom-uri.lndo.site'
EOF
lando rebuild -y

# Should have DRUSH_OPTIONS_URI set to the custom URI
lando exec appserver -- "env" | grep DRUSH_OPTIONS_URI | grep "https://custom-uri.lndo.site"
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
