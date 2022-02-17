---
title: Getting Started
description: Learn how to get started with the Lando Pantheon recipe.
---

# Getting Started

## Requirements

Before you get started with this recipe, we assume that you have:

1. [Installed Lando](https://docs.lando.dev/basics/installation.html) and gotten familiar with [its basics](https://docs.lando.dev/basics/).
2. [Initialized](https://docs.lando.dev/basics/init.html) a [Landofile](https://docs.lando.dev/config/lando.html) for your codebase for use with this recipe.
3. Read about the various [services](https://docs.lando.dev/config/services.html), [tooling](https://docs.lando.dev/config/tooling.html), [events](https://docs.lando.dev/config/events.html) and [routing](https://docs.lando.dev/config/proxy.html) Lando offers.

## Quick Start

```bash
# Go through interactive prompts to get your site from pantheon
lando init --source pantheon

# OR do it non-interactively
lando init \
  --source pantheon \
  --pantheon-auth "$PANTHEON_MACHINE_TOKEN" \
  --pantheon-site "$PANTHEON_SITE_NAME"

# Start it up
lando start

# Import your database and files
lando pull

# List information about this app.
lando info
```

## Custom Installation

This plugin is included with Lando by default. That means if you have Lando version `3.0.8` or higher then this plugin is already installed!

However if you would like to manually install the plugin, update it to the bleeding edge or install a particular version then use the below. Note that this installation method requires Lando `3.5.0+`.

:::: code-group
::: code-group-item DOCKER
```bash:no-line-numbers
# Ensure you have a global plugins directory
mkdir -p ~/.lando/plugins

# Install plugin
# NOTE: Modify the "yarn add @lando/pantheon" line to install a particular version eg
# yarn add @lando/pantheon@0.5.2
docker run --rm -it -v ${HOME}/.lando/plugins:/plugins -w /tmp node:14-alpine sh -c \
  "yarn init -y \
  && yarn add @lando/pantheon --production --flat --no-default-rc --no-lockfile --link-duplicates \
  && yarn install --production --cwd /tmp/node_modules/@lando/pantheon \
  && mkdir -p /plugins/@lando \
  && mv --force /tmp/node_modules/@lando/pantheon /plugins/@lando/pantheon"

# Rebuild the plugin cache
lando --clear
```
:::
::: code-group-item HYPERDRIVE
```bash:no-line-numbers
# @TODO
# @NOTE: This doesn't actaully work yet
hyperdrive install @lando/pantheon
```
::::

You should be able to verify the plugin is installed by running `lando config --path plugins` and checking for `@lando/pantheon`. This command will also show you _where_ the plugin is being loaded from.