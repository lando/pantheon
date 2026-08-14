# Pantheon Frontend Build Example

This example exists primarily to test Pantheon `frontend_build` support:

* [Pantheon Recipe - Frontend builds](https://docs.lando.dev/plugins/pantheon/config.html#frontend-builds)

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
# Should compile the theme during start
cat web/themes/custom/demo/dist/built.txt | grep built

# Should expose frontend-build tooling
lando frontend-build --help

# Should expose npm because this path has package-lock.json
lando npm --version

# Should expose node
lando node --version

# Should rebuild the theme without a full rebuild
rm -rf web/themes/custom/demo/dist
lando frontend-build
cat web/themes/custom/demo/dist/built.txt | grep built

# Should run npm in the current directory
cd web/themes/custom/demo
rm -rf dist
lando npm run build
cat dist/built.txt | grep built
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
