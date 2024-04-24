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

If you would like to customize `lando pull`, `lando push` or `lando switch` you can do so using [tooling](https://docs.lando.dev/core/v3/tooling.html#tooling) or [tooling overrides](https://docs.lando.dev/core/v3/tooling.html#overriding) directly to achieve your specific use case. This should allow you to:

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

## Using Drush

Lando will look for a [`pantheon.yml`](https://docs.pantheon.io/pantheon-yml/) (and/or `pantheon.upstream.yml`) in your app's root directory and will globally install whatever `drush_version` you've specified there. However, it will not go below Drush 8. This means that if you've specified Drush 5, Lando will still install Drush 8.

If this has not been specified then we will globally install the [latest version of Drush 8](http://docs.drush.org/en/8.x/install/) unless you are running on `php 5.3` in which case we will install the [latest version of Drush 7](http://docs.drush.org/en/7.x/install/). For Backdrop sites, we will also install the latest version of [Backdrop Drush](https://github.com/backdrop-contrib/backdrop-drush-extension).

This means that you should be able to use `lando drush` out of the box. That said, you can [easily change](https://docs.lando.dev/plugins/pantheon/config.html) the Drush installation behavior if you so desire.

If you decide to list `drush` as a dependency in your project's `composer.json` then Lando will use that one instead. You should be careful if you use Drush 9 as this is not currently *officially* supported by Pantheon.

### Configuring your root directory

If you are using `web_docroot` in your `pantheon.yml`, you will need to remember to `cd` into that directory and run `lando drush` from there. This is because many site-specific `drush` commands will only run correctly if you run `drush` from a directory that also contains a Drupal site.

If you are annoyed by having to `cd` into that directory every time you run a `drush` command, you can get around it by [overriding](https://docs.lando.dev/core/v3/tooling.html#overriding) the `drush` tooling command in your [Landofile](https://docs.lando.dev/core/v3) so that Drush always runs from your `webroot`.

**Note that hard coding the `root` like this may have unforeseen and bad consequences for some `drush` commands such as `drush scr`.**

```yaml
tooling:
  drush:
    service: appserver
    cmd: drush --root=/app/PATH/TO/WEBROOT
```

### URL Setup

To set up your environment so that commands like `lando drush uli` return the proper URL, you will need to configure Drush in your relevant `settings.php` file.

**Drupal 7**

```php
// Set the base URL for the Drupal site.
$base_url = "http://mysite.lndo.site"
```

**Drupal 8**

```php
$options['uri'] = "http://mysite.lndo.site";
```

## Using Terminus

You should be able to use `terminus` commands in the exact same way by prefixing them with `lando` (e.g. `lando terminus auth:whoami`).

### Terminus Plugins

By default, Lando will only install `terminus` proper but you can add [Terminus Plugins](https://docs.pantheon.io/terminus/plugins/directory/) to your Landofile with a [build step](https://docs.lando.dev/core/v3/services/lando.html#build-steps).

You will want to consult the relevant install instructions for each plugin but an example that installs the [Terminus Build Tools](https://github.com/pantheon-systems/terminus-build-tools-plugin) plugin is shown below:

```yml
services:
  appserver:
    build:
      - mkdir -p ~/.terminus/plugins
      - composer create-project -d ~/.terminus/plugins pantheon-systems/terminus-build-tools-plugin:~1
```
