# Pantheon Lando Plugin

This is the _official_ [Lando](https://lando.dev) plugin for [Pantheon](https://pantheon.io). When installed it...

* Closely mimics Pantheon's [stack, versions](https://docs.pantheon.io/platform/) and [environment](https://docs.pantheon.io/read-environment-config/) locally
* Allows you to easily `pull` your Pantheon site down locally
* Allows you to easily `push` your changes back to Pantheon
* Installs `drush`, `terminus` and other power tools.

Of course, once a user is running their Pantheon project with Lando they can take advantage of [all the other awesome development features](https://docs.lando.dev) Lando provides.


## Basic Usage

Clone a project down from Pantheon.

```bash
# Make and go into an empty directory
mkdir myproject && cd myproject

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

Once your project is running you can access [relevant tooling commands](https://github.com/lando/pantheon/blob/main/docs/usage.md#application-tooling).

For more info you should check out the [docs](https://docs.lando.dev/pantheon):

* [Getting Started](https://docs.lando.dev/pantheon/getting-started.html)
* [Configuration](https://docs.lando.dev/pantheon/config.html)
* [Tooling](https://docs.lando.dev/pantheon/tooling.html)
* [Syncing](https://docs.lando.dev/pantheon/syncing.html)
* [Guides](https://docs.lando.dev/pantheon/adding-more-tooling.html)
* [Examples](https://github.com/lando/pantheon/tree/main/examples)
* [Development](https://docs.lando.dev/pantheon/development.html)

## Issues, Questions and Support

If you have a question or would like some community support we recommend you [join us on Slack](https://launchpass.com/devwithlando).

If you'd like to report a bug or submit a feature request then please [use the issue queue](https://github.com/lando/pantheon/issues/new/choose) in this repo.

## Changelog

We try to log all changes big and small in both [THE CHANGELOG](https://github.com/lando/pantheon/blob/main/CHANGELOG.md) and the [release notes](https://github.com/lando/pantheon/releases).

## Development

If you're interested in working on this plugin then we recommend you check out the [development guide](https://github.com/lando/pantheon/blob/main/docs/development.md).


## Maintainers

* [@pirog](https://github.com/pirog)
* [@reynoldsalec](https://github.com/reynoldsalec)

## Contributors

<a href="https://github.com/lando/pantheon/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lando/pantheon" />
</a>

Made with [contributors-img](https://contrib.rocks).

## Other Selected Resources

* [LICENSE](https://github.com/lando/pantheon/blob/main/LICENSE.md)
* [The best professional advice ever](https://www.youtube.com/watch?v=tkBVDh7my9Q)
