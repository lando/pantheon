---
title: Using Terminus
description: Learn how to work with Terminus in your Pantheon database in Lando.
guide: true
mailchimp:
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  title: Want more Pantheon guide content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

# Using Terminus

You should be able to use `terminus` commands in the exact same way by prefixing them with `lando` (e.g. `lando terminus auth:whoami`).

### Terminus Plugins

By default, Lando will only install `terminus` proper but you can add [Terminus Plugins](https://pantheon.io/docs/terminus/plugins/directory/) to your Landofile with a [build step](https://docs.lando.dev/config/services.html#build-steps).

You will want to consult the relevant install instructions for each plugin but an example that installs the [Terminus Build Tools](https://github.com/pantheon-systems/terminus-build-tools-plugin) plugin is shown below:

```yml
services:
  appserver:
    build:
      - mkdir -p ~/.terminus/plugins
      - composer create-project -d ~/.terminus/plugins pantheon-systems/terminus-build-tools-plugin:~1
```
