---
title: Pantheon Lando Plugin
description: The best local development option for Drupal 7, Drupal 8/9 or WordPress sites running on Pantheon. Get Terminus and all the usual power tools plus awesome workflow automation.
next: ./getting-started.html
---

# Pantheon

[Pantheon](https://pantheon.io) is a web development hosting platform for open-source Drupal and WordPress websites. It is an app-specific PaaS provider, sold on a monthly subscription basis, with several support tiers available.

Lando provides a snazzy integration that:

* Closely mimics Pantheon's [stack, versions](https://pantheon.io/docs/platform/) and [environment](https://pantheon.io/docs/read-environment-config/) locally
* Allows you to easily `pull` your Pantheon site down locally
* Allows you to easily `push` your changes back to Pantheon
* Installs `drush`, `terminus` and other power tools.

However, in order to profit, **you must** have an account and a site on Pantheon to be able to use this recipe. If you don't, you can sign up [here](https://pantheon.io/register).

You should also check out Pantheon's [local dev](https://pantheon.io/docs/local-development/) docs.


## Custom Installation

This plugin is included with Lando by default. That means if you have Lando version `3.0.8` or higher then this plugin is already installed!

However if you would like to manually install the plugin, update it to the bleeding edge or install a particular version then use the below. Note that this installation method requires Lando `3.5.0+`.

:::: code-group
::: code-group-item LANDO 3.21+
```bash:no-line-numbers
lando plugin-add @lando/pantheon
```
:::
::: code-group-item HYPERDRIVE
```bash:no-line-numbers
# @TODO
# @NOTE: This doesn't actaully work yet
hyperdrive install @lando/pantheon
```
:::
::: code-group-item DOCKER
```bash:no-line-numbers
# Ensure you have a global plugins directory
mkdir -p ~/.lando/plugins

# Install plugin
# NOTE: Modify the "npm install @lando/pantheon" line to install a particular version eg
# npm install @lando/pantheon@0.5.2
docker run --rm -it -v ${HOME}/.lando/plugins:/plugins -w /tmp node:16-alpine sh -c \
  "npm init -y \
  && npm install @lando/pantheon --production --flat --no-default-rc --no-lockfile --link-duplicates \
  && npm install --production --cwd /tmp/node_modules/@lando/pantheon \
  && mkdir -p /plugins/@lando \
  && mv --force /tmp/node_modules/@lando/pantheon /plugins/@lando/pantheon"

# Rebuild the plugin cache
lando --clear
```
:::
::::

You should be able to verify the plugin is installed by running `lando config --path plugins` and checking for `@lando/pantheon`. This command will also show you _where_ the plugin is being loaded from.
