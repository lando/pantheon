Pantheon Drupal 9 Example
=========================

This example exists primarily to test the following:

* [Pantheon Recipe - Drupal 9](https://docs.devwithlando.io/tutorials/pantheon.html)

**Note that you will need to replace (or export) `$PANTHEON_MACHINE_TOKEN` and `--pantheon-site` to values that make sense for you.**

Start up tests
--------------

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff

# Should initialize the lando pantheon test drupal9 site
git clone https://github.com/lando/pantheon-gitpod.git drupal9
cd drupal9
lando init --source cwd --pantheon-auth "$PANTHEON_MACHINE_TOKEN" --pantheon-site landobot-drupal9
```

Destroy tests
-------------

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be able to remove our pantheon ssh keys
cp -r remove-keys.sh drupal9/remove-keys.sh
cd drupal9
lando ssh -s appserver -c "/app/remove-keys.sh"
cd ..
rm -rf drupal9/remove-keys.sh

# Should be able to destroy our drupal9 site with success
cd drupal9
lando destroy -y
lando poweroff
```