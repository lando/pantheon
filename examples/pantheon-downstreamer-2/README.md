# Pantheon Downstreamer Example

This example exists primarily to test the following documentation:

* [Pantheon Recipe](https://docs.lando.dev/pantheon/config.html)

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should start up successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should use mariadb 10.6
lando exec database -- "mysql -V" | grep 10.6.

# Should be able to connect to the pantheon db.
lando mysql pantheon -e quit

# Should use the default mysql config file
lando exec database -- "cat /opt/bitnami/mariadb/conf/my_custom.cnf" | grep "LANDOPANTHEONMYSQLCNF"
lando mysql -u root -e "show variables;" | grep innodb_lock_wait_timeout | grep 121

# Should portforward DB by default.
lando info --filter service=database | grep -vq "port: 'not forwarded'"

# Should portforward redis by default.
lando info --filter service=cache | grep -vq "port: 'not forwarded'"

# Should portforward solr by default.
lando info --filter service=index | grep -vq "port: 'not forwarded'"
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
