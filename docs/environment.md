---
title: Environment
description: Learn how to work with Environment variables within the Lando Pantheon recipe.
---

# Environment

## Environment Variables

Like Pantheon, Lando will also [inject variables](https://docs.pantheon.io/read-environment-config/) into your runtime container so that you have useful information stored about your app. These are stored directly in the environment (e.g. accessible via [`getenv()`](http://php.net/manual/en/function.getenv.php)), `$_ENV`, `$_SERVER` or as defined `php` constants.

A non-exhaustive list of some of the most commonly used config is shown below:

```bash
# Site info
PANTHEON_BINDING: lando
PANTHEON_ENVIRONMENT: lando
PANTHEON_SITE_NAME: Your Pantheon site name
PANTHEON_SITE: Your Pantheon UUID
FILEMOUNT: The location of your files directory
DOCROOT: /
FRAMEWORK: Either drupal, drupal8, backdrop, or wordpress
HTTP_X_SSL: ON or undefined
HTTPS: on or undefined

# Cache connection info
CACHE_HOST: cache
CACHE_PASSWORD:
CACHE_PORT: 6379

# DB connection info
DB_HOST: database
DB_PORT: 3306
DB_NAME: pantheon
DB_PASSWORD: pantheon
DB_USER: pantheon

# Index connection info
PANTHEON_INDEX_HOST: index
PANTHEON_INDEX_PORT: 449

# WordPress things
AUTH_KEY: Needed for Wordpress. We set this automatically.
AUTH_SALT: Needed for Wordpress. We set this automatically.
LOGGED_IN_KEY: Needed for Wordpress. We set this automatically.
LOGGED_IN_SALT: Needed for Wordpress. We set this automatically.
NONCE_KEY: Needed for Wordpress. We set this automatically.
NONCE_SALT: Needed for Wordpress. We set this automatically.
SECURE_AUTH_KEY: Needed for Wordpress. We set this automatically.
SECURE_AUTH_SALT: Needed for Wordpress. We set this automatically.

# Drupal/Backdrop things
BACKDROP_SETTINGS: JSON object of Backdrop config and settings.
PRESSFLOW_SETTINGS: JSON object of Drupal config and settings.
DRUPAL_HASH_SALT: Needed for Drupal8. We set this automatically.
```

These are in addition to the [default variables](https://docs.lando.dev/core/v3/env.html#default-environment-variables) that we inject into every container.

**NOTE:** These can vary based on the choices you make in your recipe config.
