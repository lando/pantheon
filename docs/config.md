---
title: Configuration
description: Learn how to configure the Lando Pantheon recipe.
---

# Configuration

While Lando [recipes](https://docs.lando.dev/config/recipes.html) set sane defaults so they work out of the box, they are also [configurable](https://docs.lando.dev/config/recipes.html#config).

Here are the configuration options, set to the default values, for this recipe. If you are unsure about where this goes or what this means we *highly recommend* scanning the [recipes documentation](https://docs.lando.dev/config/recipes.html) to get a good handle on how the magicks work.

```yaml
recipe: pantheon
config:
  framework: PANTHEON_SITE_FRAMEWORK
  id: PANTHEON_SITE_ID
  site: PANTHEON_SITE_MACHINE_NAME
  xdebug: false
  index: true
  edge: true
  cache: true
  composer_version: "2.0.7"
```

If you do not already have a [Landofile](https://docs.lando.dev/config/lando.html) for your Pantheon site, we highly recommend you use [`lando init`](https://docs.lando.dev/basics/init.html) to get one as that will automatically populate the `framework`, `id` and `site` for you. Manually creating a Landofile with these things set correctly can be difficult and is *highly discouraged.*

Note that if the above config options are not enough, all Lando recipes can be further [extended and overriden](https://docs.lando.dev/config/recipes.html#extending-and-overriding-recipes).

## Choosing a php version

Lando will look for a [`pantheon.yml`](https://pantheon.io/docs/pantheon-yml/) (and/or `pantheon.upstream.yml`) in your app's root directory and use whatever `php_version` you've specified there.

This means that **you can not configure the php version directly in your Landofile for this recipe.**

If you change this version, make sure you [`lando rebuild`](https://docs.lando.dev/cli/rebuild.html) for the changes to apply.

**Example pantheon.yml**

```yaml
api_version: 1
php_version: 7.1
```

## Choosing a nested webroot

Lando will look for a [`pantheon.yml`](https://pantheon.io/docs/pantheon-yml/) (and/or `pantheon.upstream.yml`) in your app's root directory and use whatever `web_docroot` you've specified there.

This means that **you cannot configure the webroot directly in your Landofile for this recipe.**

If you change this version, make sure you [`lando rebuild`](https://docs.lando.dev/cli/rebuild.html) for the changes to apply.

**Example pantheon.yml**

```yaml
api_version: 1
web_docroot: true
```

## Customizing the stack

By default, Lando will spin up a **very close** approximation of the Pantheon stack:

* [php appserver served by nginx](https://pantheon.io/docs/application-containers/)
* [mariadb database](https://pantheon.io/blog/using-mariadb-mysql-replacement)
* [redis cache](https://pantheon.io/docs/redis/)
* [solr index](https://pantheon.io/docs/solr/)
* [varnish edge](https://pantheon.io/docs/caching-advanced-topics/)

Please review the docs to get a better handle on [how Pantheon works](https://pantheon.io/how-it-works) below:

*   [Pantheon Edge and Varnish](https://pantheon.io/docs/varnish/)
*   [Pantheon Index and Solr](https://pantheon.io/docs/solr/)
*   [Pantheon Caching and Redis](https://pantheon.io/docs/redis/)

What works on Pantheon **should** also work on Lando but recognize that the Pantheon platform is changing all the time and Lando is necessarily reactive.

All that said, you can, however, tell Lando to *not use* the more advanced parts of Pantheon's stack. This can save time when starting up your app.

```yaml
recipe: pantheon
config:
  framework: PANTHEON_SITE_FRAMEWORK
  id: PANTHEON_SITE_ID
  site: PANTHEON_SITE_MACHINE_NAME
  # Disable the SOLR index
  index: false
  # Disable the VARNISH edge
  edge: false
  # Disable the REDIS cache
  cache: false
```

Note that if your application code depends on one of these services and you disable them, you should expect an error. Also note that Lando does not track what services you are using on your Pantheon site (e.g. these settings are "decoupled").

## Using xdebug

This is just a passthrough option to the [xdebug setting](https://docs.lando.dev/config/php.html#toggling-xdebug) that exists on all our [php services](https://docs.lando.dev/config/php.html). The `tl;dr` is `xdebug: true` enables and configures the php xdebug extension and `xdebug: false` disables it.

```yaml
recipe: lamp
config:
  xdebug: true|false
```

However, for more information, we recommend you consult the [php service documentation](https://docs.lando.dev/config/php.html).