# Pantheon Development Guide

This guide contains information to help onboard developers to work on the [Pantheon](https://pantheon.io) integration, hereafter referred to as "the plugin".

After reading through it the developer should understand:

* The high level goals of the integration
* The general features roadmap
* How the plugin is structured
* How additional services containers are added
* How additional tooling is added
* How the project is tested
* Where framework level overrides live
* Contributing code

It may also be valuable to review the [user documentation](https://docs.lando.dev/config/pantheon.html) for this integration as that provides a bit of a Specification as Documentation.

## Overview

The high level goals of the integration are straightforward:

### 1. Use Pantheon images

This allow users to run their Pantheon projects locally using the same images, build processes, configuration, etc as they do on Pantheon itself. This means that a Landofile using the `Pantheon` recipe can be be something simple like this:

```yaml
name: lando-pantheon
recipe: pantheon
```

### 2. Provide other "flavors" and a broader base of "services"

TBD

### 3. Interact with the remote Pantheon environment

TBD on how we want to do this.

### 4. Get all the other built-in benefits of Lando

RTFM if you need more info on dat.

## Project Structure

This plugin follows the same structure as any [Lando plugin](https://docs.lando.dev/contrib/contrib-plugins.html#plugins) but here is an explicit breakdown:

```bash
./
|-- lib             Utilities and helpers, things that can easily be unit tested
|-- recipes
    |-- Pantheon      The files to define the `Pantheon` recipe and its `init` command
|-- services        Defines each Pantheon service eg `solr` or `php`
|-- test            Unit tests
|-- types           Defines the type/parent each above service can be
|-- app.js          Modifications to the app runtime
|-- index.js        Modifications to the Lando runtime
```

## Services and Types

TBD

## Getting started

It's easiest to develop by spinnning up the Pantheon D9 example directly in the Lando codebase

* [Drupal](https://github.com/lando/pantheon/tree/main/examples/drupal)

```bash
# This assumes you have already installed lando from source and are in its root directory
cd examples/drupal

# Spin up one of your Pantheon Sites
rm -rf drupal && mkdir -p drupal && cd drupal
lando init --source Pantheon --Pantheon-key "$Pantheon_API_KEY" --Pantheon-secret "$Pantheon_API_SECRET" --Pantheon-app "$Pantheon_APP_ID" 
lando start
```

## Other considerations

### Limited support

TBD

### Development

This is going to be a lean and agile project where user feedback drives development. For example a user is going to try it out and say "cool, but what about solr", Pantheon will add support for Solr to the relevant example repos, let us know, and then we will add support/tests for solr in Lando.

## Testing

Its best to familiarize yourself with how Lando [does testing](https://docs.lando.dev/contrib/contrib-testing.html) in general before proceeding.

### Unit Tests

Generally, unit testable code should be placed in `lib` and then the associated test in `tests` in the form `FILE-BEING-TESTED.spec.js`. Here is an example:


```bash
./
|-- lib
    |-- stuff.js
|-- test
    |-- stuff.spec.js
```

These tests can then be run with `yarn test:unit`.

### Func Tests

Func tests are made by just adding more entries to each examples README. This uses our made-just-for-Lando testing framework [Leia](https://github.com/lando/leia). See below for our current Pantheon tests:

* [Drupal](https://github.com/lando/pantheon/tree/main/examples/drupal)

These are then run by GitHub Actions. While you _can_ run all the func test locally this can take a LONG time. If you decide you want to do that we recommend you generate the test files and then invoke the tests for just one example.

```bash
# Generate tests
yarn generate-tests

# Run a single examples tests
yarn mocha --timeout 900000 test/pantheon-drupal-9-example.func.js
```

## Contribution

WIP but outline is

1. GitHub flow as normal eg branch for an issue -> PR -> merge
2. Lets review all Pantheon PRs together for awhile: this should keep us on the same page and also force knowledge transfer
3. Lets definitely be updating the user docs/dev docs
4. Once we have the d8 and kitchen sink example func tests lets also be adding tests on every commit
5. Lets wait on unit tests until things settle down a bit but a good rule of thumb is try to put things we would want to unit tests in `lib` somewhere.
