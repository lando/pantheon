---
title: Using Drush
description: Learn how to work with Drush in your Pantheon database in Lando.
guide: true
mailchimp:
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  title: Want more Pantheon guide content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

# Using Drush

Lando will look for a [`pantheon.yml`](https://pantheon.io/docs/pantheon-yml/) (and/or `pantheon.upstream.yml`) in your app's root directory and will globally install whatever `drush_version` you've specified there. However, it will not go below Drush 8. This means that if you've specified Drush 5, Lando will still install Drush 8.

If this has not been specified then we will globally install the [latest version of Drush 8](http://docs.drush.org/en/8.x/install/) unless you are running on `php 5.3` in which case we will install the [latest version of Drush 7](http://docs.drush.org/en/7.x/install/). For Backdrop sites, we will also install the latest version of [Backdrop Drush](https://github.com/backdrop-contrib/drush).

This means that you should be able to use `lando drush` out of the box. That said, you can [easily change](#configuration) the Drush installation behavior if you so desire.

If you decide to list `drush` as a dependency in your project's `composer.json` then Lando will use that one instead. You should be careful if you use Drush 9 as this is not currently *officially* supported by Pantheon.

## Configuring your root directory

If you are using `web_docroot` in your `pantheon.yml`, you will need to remember to `cd` into that directory and run `lando drush` from there. This is because many site-specific `drush` commands will only run correctly if you run `drush` from a directory that also contains a Drupal site.

If you are annoyed by having to `cd` into that directory every time you run a `drush` command, you can get around it by [overriding](https://docs.lando.dev/config/tooling.html#overriding) the `drush` tooling command in your [Landofile](https://docs.lando.dev/config/lando.html) so that Drush always runs from your `webroot`.

**Note that hard coding the `root` like this may have unforeseen and bad consequences for some `drush` commands such as `drush scr`.**

```yaml
tooling:
  drush:
    service: appserver
    cmd: drush --root=/app/PATH/TO/WEBROOT
```

## URL Setup

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
