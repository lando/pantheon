---
title: Tooling
description: Learn about the various out-of-the-box tooling you get with the Lando Pantheon recipe.
---

# Tooling

Each Lando Pantheon recipe will also ship with the Pantheon toolchain. This means you can use `drush`, `wp-cli` and `terminus` via Lando and avoid mucking up your actual computer trying to manage `php` versions and tooling.

```bash
lando composer          Runs composer commands
lando db-export [file]  Exports database from a database service to a file
lando db-import <file>  Imports a dump file into a database service
lando drush             Runs drush commands
lando drupal            Runs drupal console commands
lando mysql             Drops into a MySQL shell on a database service
lando php               Runs php commands
lando pull              Pull code, database and/or files from Pantheon
lando push              Push code, database and/or files to Pantheon
lando switch            Switch to a different multidev environment
lando terminus          Runs terminus commands
lando version           Displays the lando version
```

**Note that the above commands can differ by your recipes `framework`.** The above are for `framework: drupal8`. We recommend you run `lando` in your app for a complete and up to date listing of your tooling.

```bash
# Login to terminus with a machine token
lando terminus auth:login --machine-token=MYSPECIALTOKEN

# Get a list of wp-cli commands
# Only available for framework: wordpress
lando wp

# Download a dependency with drush
lando drush dl views

# Download a dependency with composer
lando composer config repositories.drupal composer https://packages.drupal.org/8
lando composer require "drupal/search_api_pantheon ~1.0" --prefer-dist

# Download a backdrop dependency
lando drush dl webform
```

## Customizing Pantheon tooling

If you would like to customize `lando pull`, `lando push` or `lando switch` you can do so using [tooling](https://docs.lando.dev/config/tooling.html#tooling) or [tooling overrides](https://docs.lando.dev/config/tooling.html#overriding) directly to achieve your specific use case. This should allow you to:

* Disable Pantheon tooling
* Provide additional `pull`, `push` or `switch` use cases
* Override the default `pull`, `push` or `switch` functionality
* Remove interactive choices

**disable all commands that interact with Pantheon**

```yaml
tooling:
  pull: disabled
  push: disabled
  switch: disabled
```

**add a custom, non-interactive command that only gets files and database from live**

```yaml
tooling:
  pull-live-data:
    service: appserver
    cmd: /helpers/pull.sh --code=none --database=live --files=live
```

**override the default lando pull command so it never pull code**

```yaml
tooling:
  pull:
    description: Pull things except code
    options:
      code:
        default: none
```

**override the default lando push command so it never pushes the database**

::: tip This is a good idea
Putting database config into code via `features` or `cmi` and pushing that is consider a best practice so this is a good override for professionals.
:::

```yaml
tooling:
  push:
    description: Pro push
    options:
      database:
        default: none
```