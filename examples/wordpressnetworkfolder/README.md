# Pantheon WordPress Network Folder Example

This example exists primarily to test the following documentation:

* [Pantheon Recipe - WordPress Network](https://docs.devwithlando.io/tutorials/pantheon.html)

**Note that you will need to replace (or export) `$PANTHEON_MACHINE_TOKEN` and `--pantheon-site` to values that make sense for you.**

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff

# Should initialize the lando pantheon test wordpress site
rm -rf wordpress && mkdir -p wordpress && cd wordpress
lando init --source pantheon --pantheon-auth "$PANTHEON_MACHINE_TOKEN" --pantheon-site landobot-network-folder
cp ../../.lando.upstream.yml .lando.upstream.yml

# Should start up our wordpress site successfully
cd wordpress
lando start

# Should pull down database and files for our wordpress site
cd wordpress
lando pull --code none --database dev --files dev
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should be able to bootstrap wordpress
cd wordpress
lando wp eval "phpinfo();"

# Should have wp cli
cd wordpress
lando wp cli version

# Should set /var/www/.wp-cli/config.yml with LANDO_WEBROOT as PATH
cd wordpress
lando exec appserver -- "cat /var/www/.wp-cli/config.yml | grep path | grep /app"

# Should have terminus
cd wordpress
lando terminus -V

# Should be logged in
cd wordpress
lando terminus auth:whoami | grep droid@lando.dev

# Should use custom php version if set in pantheon.yml
cd wordpress
lando php -v | grep "PHP 7.3"

# Should set the correct wordpress specific pantheon environment
cd wordpress
lando exec -- "env" | grep FRAMEWORK | grep wordpress
lando exec -- "env" | grep FILEMOUNT | grep "wp-content/uploads"

# Should serve proxy from nginx
cd wordpress
curl -LI http://landobot-network-folder.lndo.site | grep Via || echo $? | grep 1

# Should serve subsites
curl -L http://landobot-network-folder.lndo.site/site1 | grep site1 || echo $? | grep 1
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be able to remove our pantheon ssh keys
cp -r remove-keys.sh wordpress/remove-keys.sh
cd wordpress
lando exec appserver -- "/app/remove-keys.sh"
rm -rf wordpress/remove-keys.sh

# Should be able to destroy our wordpress site with success
cd wordpress
lando destroy -y
lando poweroff
```
