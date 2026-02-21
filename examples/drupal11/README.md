# Pantheon Drupal 11 Example

This example exists primarily to test the following:

* [Pantheon Recipe - Drupal 11](https://docs.lando.dev/plugins/pantheon)

**Note that you will need to replace (or export) `$PANTHEON_MACHINE_TOKEN` and `--pantheon-site` to values that make sense for you.**

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff

# Should initialize the lando pantheon test drupal11 site
rm -rf drupal11 && mkdir -p drupal11 && cd drupal11
lando init --source pantheon --pantheon-auth "$PANTHEON_MACHINE_TOKEN" --pantheon-site landobot-drupal11
cp ../../.lando.upstream.yml .lando.upstream.yml

# Should start up our drupal11 site successfully
cd drupal11
lando start

# Should pull down database and files for our drupal11 site
cd drupal11
lando pull --code none --database dev --files dev --rsync
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should be able to bootstrap drupal11
cd drupal11
lando drush status | grep "Connected"

# Should use the drush in pantheon.yml
cd drupal11
lando drush version | grep 13.

# Should have terminus
cd drupal11
lando terminus -V

# Should be logged in
cd drupal11
lando terminus auth:whoami | grep "@"

# Should have a binding.pem in all the right places
cd drupal11
lando exec appserver -- "stat /var/www/certs/binding.pem"
lando exec appserver -u root -- "stat /root/certs/binding.pem"

# Should set the correct pantheon environment
cd drupal11
lando exec appserver -- "env" | grep BACKDROP_SETTINGS | grep pantheon
lando exec appserver -- "env" | grep CACHE_HOST | grep cache
lando exec appserver -- "env" | grep CACHE_PORT | grep 6379
lando exec appserver -- "env" | grep DB_HOST | grep database
lando exec appserver -- "env" | grep DB_PORT | grep 3306
lando exec appserver -- "env" | grep DB_USER | grep pantheon
lando exec appserver -- "env" | grep DB_PASSWORD | grep pantheon
lando exec appserver -- "env" | grep DB_NAME | grep pantheon
lando exec appserver -- "env" | grep FRAMEWORK | grep drupal8
lando exec appserver -- "env" | grep FILEMOUNT | grep "sites/default/files"
lando exec appserver -- "env" | grep PANTHEON_ENVIRONMENT | grep lando
lando exec appserver -- "env" | grep PANTHEON_INDEX_HOST | grep index
lando exec appserver -- "env" | grep PANTHEON_INDEX_SCHEME | grep http
lando exec appserver -- "env" | grep PANTHEON_SITE | grep c354aed8-76eb-44d7-8f54-57b9ea3079be
lando exec appserver -- "env" | grep PANTHEON_SITE_NAME | grep landobot-drupal11
lando exec appserver -- "env" | grep php_version | grep "8.4"
lando exec appserver -- "env" | grep PRESSFLOW_SETTINGS | grep pantheon
lando exec appserver -- "env" | grep TERMINUS_ENV | grep dev
lando exec appserver -- "env" | grep TERMINUS_SITE | grep landobot-drupal11
lando exec appserver -- "env" | grep -E "TERMINUS_USER=.+@.+"

# Should use php 8.4 in pantheon.yml
cd drupal11
lando php -v | grep "PHP 8.4"

# Should use the database version in pantheon.yml
cd drupal11
lando exec database -- "mysql -V" | grep 10.6.

# Should use a varnish http_resp_hdr_len setting of 25k
cd drupal11
lando varnishadm param.show http_resp_hdr_len | grep 'Value is: 25k'

# Should have all pantheon services running and their tooling enabled by defaults
docker ps --filter label=com.docker.compose.project=landobotdrupal11 | grep landobotdrupal11_appserver_nginx_1
docker ps --filter label=com.docker.compose.project=landobotdrupal11 | grep landobotdrupal11_appserver_1
docker ps --filter label=com.docker.compose.project=landobotdrupal11 | grep landobotdrupal11_database_1

# Should use the correct default config files
cd drupal11
lando exec appserver -- "cat /usr/local/etc/php/conf.d/zzz-lando-my-custom.ini" | grep "; LANDOPANTHEONPHPINI"
lando exec database -- "cat /opt/bitnami/mariadb/conf/my_custom.cnf" | grep "LANDOPANTHEONMYSQLCNF"

# Should not have xdebug enabled by default
cd drupal11
lando php -m | grep xdebug || echo $? | grep 1

# Should have the imagick PHP extension enabled
cd drupal11
lando php -m | grep imagick

# Should have ImageMagick 7 for PHP 8.4
cd drupal11
lando php -r 'echo Imagick::getVersion()["versionString"];' | grep "ImageMagick 7\."

# Should have phpredis with igbinary support
cd drupal11
lando php -r 'var_dump(defined("Redis::SERIALIZER_IGBINARY"));' | grep 'bool(true)'

# Should be able to pull the database without SSL errors
# https://github.com/lando/pantheon/issues/316
cd drupal11
! lando pull --code none --database dev --files none 2>&1 | grep "TLS/SSL error"

# Should be able to connect to the database with mysql client without SSL errors
cd drupal11
lando exec appserver -- "mysql -h database -u pantheon -ppantheon pantheon -e 'SELECT 1'" | grep 1

# Should be able to push commits to pantheon
cd drupal11
lando pull --code dev --database none --files none
lando exec appserver -- "git pull --rebase"
lando exec appserver -- "git rev-parse HEAD > test.log"
lando push --code dev --database none --files none --message "Testing commit $(git rev-parse HEAD)"

# Should allow code pull from protected environments
# https://github.com/lando/lando/issues/2021
cd drupal11
lando pull --code test --database none --files none
lando pull --code live --database none --files none

# Should switch to multidev environment
cd drupal11
lando switch -e tester
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be able to remove our pantheon ssh keys
cp -r remove-keys.sh drupal11/remove-keys.sh
cd drupal11
lando exec appserver -- "/app/remove-keys.sh"
cd ..
rm -rf drupal11/remove-keys.sh

# Should be able to destroy our drupal11 site with success
cd drupal11
lando destroy -y
lando poweroff
```
