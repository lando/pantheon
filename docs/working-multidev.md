---
title: Working With Multidev
description: Learn how to work with a Pantheon multidev setup in Lando.
guide: true
mailchimp:
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  title: Want more Pantheon guide content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

Pantheon [multidev](https://pantheon.io/docs/multidev/) is a great (and easy) way to kick-start an advanced dev workflow for teams. By default, `lando` will pull down your `dev` environment but you can use `lando switch <env>` to switch your local copy over to a Pantheon multidev environment.

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
