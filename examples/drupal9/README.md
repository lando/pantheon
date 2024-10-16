# Pantheon Drupal 9 Example

This example exists primarily to test the following:

* [Pantheon Recipe - Drupal 9](https://docs.devwithlando.io/tutorials/pantheon.html)

**Note that you will need to replace (or export) `$PANTHEON_MACHINE_TOKEN` and `--pantheon-site` to values that make sense for you.**

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff

# Should initialize the lando pantheon test drupal9 site
rm -rf drupal9 && mkdir -p drupal9 && cd drupal9
lando init --source pantheon --pantheon-auth "$PANTHEON_MACHINE_TOKEN" --pantheon-site landobot-drupal9
cp ../../.lando.upstream.yml .lando.upstream.yml

# Should start up our drupal9 site successfully
cd drupal9
lando start

# Should pull down database and files for our drupal9 site
cd drupal9
lando pull --code none --database dev --files dev --rsync
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should be able to bootstrap drupal9
cd drupal9
lando drush status | grep "Connected"

# Should use the drush in pantheon.yml
cd drupal9
lando drush version | grep 10.

# Should have terminus
cd drupal9
lando terminus -V

# Should be logged in
cd drupal9
lando terminus auth:whoami | grep droid@lando.dev

# Should have a binding.pem in all the right places
cd drupal9
lando exec appserver -- "stat /var/www/certs/binding.pem"
lando exec appserver -u root -- "stat /root/certs/binding.pem"

# Should set the correct pantheon environment
cd drupal9
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
lando exec appserver -- "env" | grep PANTHEON_INDEX_CORE | grep "\/lando"
lando exec appserver -- "env" | grep PANTHEON_INDEX_HOST | grep index
lando exec appserver -- "env" | grep PANTHEON_INDEX_PORT | grep 8983
lando exec appserver -- "env" | grep PANTHEON_INDEX_SCHEMA | grep "solr\/#\/lando\/schema"
lando exec appserver -- "env" | grep PANTHEON_INDEX_SCHEME | grep http
lando exec appserver -- "env" | grep PANTHEON_SITE | grep 3a225571-2a52-4ae9-84e7-ef54037ac66c
lando exec appserver -- "env" | grep PANTHEON_SITE_NAME | grep landobot-drupal9
lando exec appserver -- "env" | grep php_version | grep "8"
lando exec appserver -- "env" | grep PRESSFLOW_SETTINGS | grep pantheon
lando exec appserver -- "env" | grep TERMINUS_ENV | grep dev
lando exec appserver -- "env" | grep TERMINUS_SITE | grep landobot-drupal9
lando exec appserver -- "env" | grep TERMINUS_USER | grep droid@lando.dev

# Should use php version in pantheon.upstream.yml
cd drupal9
lando php -v | grep "PHP 8.1"

# Should use the database version in pantheon.yml
cd drupal9
lando exec database -- "mysql -V" | grep 10.6.

# Should use the solr version in pantheon.yml
cd drupal9
lando exec appserver -- "curl http://index:8983/solr/admin/info/system" | grep "\"solr-spec-version\":\"8.8.2\""

# Jetty redirects should work for Pantheon Search
cd drupal9
lando exec appserver -- "curl http://index:8983/lando/v1/lando/admin/system" | grep "\"solr-spec-version\":\"8.8.2\""

# Should use a varnish http_resp_hdr_len setting of 25k
cd drupal9
lando varnishadm param.show http_resp_hdr_len | grep 'Value is: 25k'

# Should have all pantheon services running and their tooling enabled by defaults
docker ps --filter label=com.docker.compose.project=landobotdrupal9 | grep landobotdrupal9_appserver_nginx_1
docker ps --filter label=com.docker.compose.project=landobotdrupal9 | grep landobotdrupal9_appserver_1
docker ps --filter label=com.docker.compose.project=landobotdrupal9 | grep landobotdrupal9_database_1

# Should not have xdebug enabled by defaults
cd drupal9
lando php -m | grep xdebug || echo $? | grep 1

# Should be able to push commits to pantheon
cd drupal9
lando pull --code dev --database none --files none
lando exec appserver -- "git rev-parse HEAD > test.log"
lando push --code dev --database none --files none --message "Testing commit $(git rev-parse HEAD)"

# Should allow code pull from protected environments
# https://github.com/lando/lando/issues/2021
cd drupal9
lando pull --code test --database none --files none
lando pull --code live --database none --files none

# Should switch to multidev environment
lando switch -e tester
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be able to remove our pantheon ssh keys
cp -r remove-keys.sh drupal9/remove-keys.sh
cd drupal9
lando exec appserver -- "/app/remove-keys.sh"
cd ..
rm -rf drupal9/remove-keys.sh

# Should be able to destroy our drupal9 site with success
cd drupal9
lando destroy -y
lando poweroff
```
