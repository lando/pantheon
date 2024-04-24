---
title: Configuration
description: Learn how to configure the Lando Pantheon recipe.
---

# Configuration

While Lando [recipes](https://docs.lando.dev/core/v3/recipes.html) set sane defaults so they work out of the box, they are also [configurable](https://docs.lando.dev/core/v3/recipes.html#config).

Here are the configuration options, set to the default values, for this recipe. If you are unsure about where this goes or what this means we *highly recommend* scanning the [recipes documentation](https://docs.lando.dev/core/v3/recipes.html) to get a good handle on how the magicks work.

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
  composer_version: "2.2.12"
```

If you do not already have a [Landofile](https://docs.lando.dev/core/v3) for your Pantheon site, we highly recommend you use [`lando init`](https://docs.lando.dev/cli/init.html) to get one as that will automatically populate the `framework`, `id` and `site` for you. Manually creating a Landofile with these things set correctly can be difficult and is *highly discouraged.*

Note that if the above config options are not enough, all Lando recipes can be further [extended and overriden](https://docs.lando.dev/core/v3/recipes.html#extending-and-overriding-recipes).

::: warning
It is inadvisable to modify the `type` attribute of Pantheon services, particularly `appserver`. A common error resulting from these modifications is `service "edge" depends on undefined service appserver_nginx: invalid compose project`.
:::

## Choosing service versions

Lando will look for a [`pantheon.yml`](https://docs.pantheon.io/pantheon-yml/) (and/or `pantheon.upstream.yml`) in your app's root directory and use the values you've set for `php_version`, `database`, and `search` you've specified there.

This means that **you can not configure php, mysql, or solr versions directly in your Landofile for this recipe.**

If you change this version, make sure you [`lando rebuild`](https://docs.lando.dev/cli/rebuild.html) for the changes to apply.

**Example pantheon.yml**

```yaml
api_version: 1
php_version: 8.1
database:
  version: 10.6
search:
  version: 8
```

## Choosing a nested webroot

Lando will look for a [`pantheon.yml`](https://docs.pantheon.io/pantheon-yml/) (and/or `pantheon.upstream.yml`) in your app's root directory and use whatever `web_docroot` you've specified there.

This means that **you cannot configure the webroot directly in your Landofile for this recipe.**

If you change this version, make sure you [`lando rebuild`](https://docs.lando.dev/cli/rebuild.html) for the changes to apply.

**Example pantheon.yml**

```yaml
api_version: 1
web_docroot: true
```

## Customizing the stack

By default, Lando will spin up a **very close** approximation of the Pantheon stack:

* [php appserver served by nginx](https://docs.pantheon.io/application-containers/)
* [mariadb database](https://pantheon.io/blog/using-mariadb-mysql-replacement)
* [redis cache](https://docs.pantheon.io/redis/)
* [solr index](https://docs.pantheon.io/solr/)
* [varnish edge](https://docs.pantheon.io/caching-advanced-topics/)

Please review the docs to get a better handle on [how Pantheon works](https://pantheon.io/about/how-it-works) below:

*   [Pantheon Edge and Varnish](https://docs.pantheon.io/varnish/)
*   [Pantheon Index and Solr](https://docs.pantheon.io/solr/)
*   [Pantheon Caching and Redis](https://docs.pantheon.io/redis/)

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

This is just a passthrough option to the [xdebug setting](https://docs.lando.dev/plugins/php/config.html#using-xdebug) that exists on all our [php services](https://docs.lando.dev/plugins/php). The `tl;dr` is `xdebug: true` enables and configures the php xdebug extension and `xdebug: false` disables it.

```yaml
recipe: lamp
config:
  xdebug: true|false
```

However, for more information, we recommend you consult the [php service documentation](https://docs.lando.dev/plugins/php).

## Working With Multidev

Pantheon [multidev](https://docs.pantheon.io/multidev/) is a great (and easy) way to kick-start an advanced dev workflow for teams. By default, `lando` will pull down your `dev` environment but you can use `lando switch <env>` to switch your local copy over to a Pantheon multidev environment.

### Usage

```bash
# Switch to the env called "feature-1"
lando switch feature-1

# Switch to the env called "feature-1" but ignore grabbing that env's files and database
# Note that this is basically a glorified `git fetch --all && git checkout BRANCH`
lando switch feature-1 --no-db --no-files
```

### Options

```bash
  --no-db     Do not switch the database
  --no-files  Do not switch the files
```

## WordPress Site Network Support (Experimental)

Lando supports WordPress site networks both in folder and sub-domain configuration. At this time, this feature is considered experimental, so there may be edge cases and Gremlins to shake out.

Make sure to first read [Pantheon's site network documentation](https://docs.pantheon.io/guides/multisite) and then consider the following edits you probably need to make to your `wp-config.php`:

```php
if ( ! empty( $_ENV['PANTHEON_ENVIRONMENT'] ) ) {
  switch( $_ENV['PANTHEON_ENVIRONMENT'] ) {
    case 'live':
      // Value should be the primary domain for the Site Network.
      define( 'DOMAIN_CURRENT_SITE', 'live-<site>.pantheonsite.io' );
      // Once you map a domain to Live, you can change DOMAIN_CURRENT_SITE
      // define( 'DOMAIN_CURRENT_SITE', 'example-network.com' );
      break;
    case 'test':
      define( 'DOMAIN_CURRENT_SITE', 'test-<site>.pantheonsite.io' );
      break;
    case 'dev':
      define( 'DOMAIN_CURRENT_SITE', 'dev-<site>.pantheonsite.io' );
      break;
    // PAY ATTENTION TO THIS CASE LANDO USER!
    case 'lando':
      define( 'DOMAIN_CURRENT_SITE', 'app-name.lndo.site' );
      break;
    default:
      # Catch-all to accommodate default naming for multi-dev environments.
      define( 'DOMAIN_CURRENT_SITE', $_ENV['PANTHEON_ENVIRONMENT'] . '-' . $_ENV['PANTHEON_SITE_NAME'] . '.pantheonsite.io' );
      break;
    }
}
```

In the above code snippet, we're adding a special case when `$_ENV['PANTHEON_ENVIRONMENT']` is set to `lando`. We do this because Lando uses a different domain scheme than Pantheon, and if we don't set this case, your Lando site will redirect to `lando-site-name.pantheonsite.io` causing much confusion.

Additionally, if you use the _sub-domain_ variation of the WordPress site network system, you'll need to add custom proxy routes to your `.lando.yml` like so:

```yml
name: landobot-network-domain
recipe: pantheon
config:
  framework: wordpress_network
  site: landobot-network-domain
  id: lolzimauuidstring
proxy:
  edge:
    - landobot-network-domain.lndo.site
    - site1.landobot-network-domain.lndo.site
    - site2.landobot-network-domain.lndo.site
```

Note that you have to re-add the default domain as well.

A special note: WordPress site networks require you to pass a few special flags to pretty much all WP-CLI commands: `--url="http://urlofmainsiteindatabase" --network`

it gets really annoying, and has even caused some workflows to fail on Pantheon in the past. See the troubleshooting and workflow sections from the Pantheon docs linked above for some examples of this. Lando tries to do this automatically for you when we run the pull command, but if you are having issues, you may need to manually run the wp-cli search-replace command with the network and url flags and closely inspect the output to troubleshoot.


