## {{ UNRELEASED_VERSION }} - [{{ UNRELEASED_DATE }}]({{ UNRELEASED_LINK }})

## v1.7.1 - [October 18, 2024](https://github.com/lando/pantheon/releases/tag/v1.7.1)

* Updated to [@lando/php@1.5.0](https://github.com/lando/php/releases/tag/v1.5.0)
* Removed `@lando/nginx`

## v1.7.0 - [October 17, 2024](https://github.com/lando/pantheon/releases/tag/v1.7.0)

* Updated all images to [gen4](https://hub.docker.com/repository/docker/devwithlando/pantheon-appserver/tags?name=-4)
* Updated to [@lando/nginx@1.3.0](https://github.com/lando/nginx/releases/tag/v1.3.0)
* Updated to [@lando/php@1.4.0](https://github.com/lando/php/releases/tag/v1.4.0)

## v1.6.0 - [October 16, 2024](https://github.com/lando/pantheon/releases/tag/v1.6.0)

* Fixed blocking `certs` issues [#261](https://github.com/lando/pantheon/issues/261) [#262](https://github.com/lando/pantheon/issues/262)
* Improved perfomance during `lando init` when `--pantheon-site` is passed in [#254](https://github.com/lando/pantheon/issues/254)

## v1.5.0 - [April 30, 2024](https://github.com/lando/pantheon/releases/tag/v1.5.0)

* Added Drupal10 config file to allow for a `framework: drupal10` value. [#242](https://github.com/lando/pantheon/issues/242)

## v1.4.2 - [April 5, 2024](https://github.com/lando/pantheon/releases/tag/v1.4.2)

* Fixed issue with the previous portforward fix. [#237](https://github.com/lando/pantheon/issues/237)

## v1.4.1 - [April 5, 2024](https://github.com/lando/pantheon/releases/tag/v1.4.1)

* Fixed issue with portforwarding no longer being available on the `database` service. [#237](https://github.com/lando/pantheon/issues/237)

## v1.4.0 - [April 1, 2024](https://github.com/lando/pantheon/releases/tag/v1.4.0)

**CRITICAL FIX**

* Addressed issue with legacy usage of the Pantheon Terminus API that has now been fully deprecated. Fixes issues with running `lando init`, `lando pull` and `lando push` in the Pantheon recipe. [#230](https://github.com/lando/pantheon/pull/230)

## v1.3.0 - [March 8, 2024](https://github.com/lando/pantheon/releases/tag/v1.3.0)

* Updated to latest database services.

## v1.2.0 - [March 4, 2024](https://github.com/lando/pantheon/releases/tag/v1.2.0)

### Fixes

* Improved `database` selection for purposes of `config` loading, fixes some `database` bootup issues when the `database` type is overriden downstream

## v1.1.0 - [March 4, 2024](https://github.com/lando/pantheon/releases/tag/v1.1.0)

### New Features

* Added support for `php:8.3`
* Added support for `php:8.2`

### Fixes

* Fixed deprecation notices from Terminus for some versions of PHP [#168](https://github.com/lando/pantheon/issues/168)

### Internal

* Updated to `@lando/php@1.2.0`
* Updated config loading to respect Lando's config settings.
* Added some config test coverage.
* Added drupal10 test coverage.

## v1.0.1 - [January 8, 2024](https://github.com/lando/pantheon/releases/tag/v1.0.1)

* Fixed missing proxy configuration.

## v1.0.0 - [December 7, 2023](https://github.com/lando/pantheon/releases/tag/v1.0.0)

* Dialed fully for `lando update`

## v0.14.0 - [December 4, 2023](https://github.com/lando/pantheon/releases/tag/v0.14.0)

* Fixed broken `mkdirp` module usage. [#202](https://github.com/lando/pantheon/pull/202)
* Isolated plugin. [#202](https://github.com/lando/pantheon/pull/202)
* Extended wait time for user. [#202](https://github.com/lando/pantheon/pull/202)

## v0.13.0 - [October 5, 2023](https://github.com/lando/pantheon/releases/tag/v0.13.0)

* Updated path to error log. [#190](https://github.com/lando/pantheon/pull/190)
* Added script to make sure user is loaded before repo clone. [#198](https://github.com/lando/pantheon/pull/198)
* Added warning/documentation regarding table prefixes on import. [#171](https://github.com/lando/pantheon/pull/171)

## v0.12.0 - [July 3, 2023](https://github.com/lando/pantheon/releases/tag/v0.12.0)

* Removed bundle-dependencies and version-bump-prompt from plugin.
* Updated package to use prepare-release-action.
* Updated documentation to reflect new release process.

## v0.11.0 - [May 26, 2023](https://github.com/lando/pantheon/releases/tag/v0.11.0)

* Set default redis to v6 and added default password. [#147](https://github.com/lando/pantheon/issues/147)

## v0.10.1 - [May 1, 2023](https://github.com/lando/pantheon/releases/tag/v0.10.1)

* Improved post `pull|push|switch` token re-auth so it only happens when needed

## v0.10.0 - [March 20, 2023](https://github.com/lando/pantheon/releases/tag/v0.10.0)

* Added support for `php` `8.2` [#159](https://github.com/lando/pantheon/issues/159)
* Added correct configset for `solr8` [#15](https://github.com/lando/pantheon/issues/15)

## v0.9.0 - [March 1, 2023](https://github.com/lando/pantheon/releases/tag/v0.9.0)

* Added support for `php` `8.1` [#132](https://github.com/lando/pantheon/issues/132)
* Added support for `solr8` [#15](https://github.com/lando/pantheon/issues/15)
* Fixed bug causing `Fatal error: Uncaught PDOException` in `prepend.php`[#139](https://github.com/lando/pantheon/issues/139)
* Fixed bug where database did not persist on `lando rebuild` for Apple Silicon users. [#148](https://github.com/lando/pantheon/pull/148)

## v0.8.0 - [February 28, 2023](https://github.com/lando/pantheon/releases/tag/v0.8.0)

* Database persistence for Apple Silicon users. [PR #148](https://github.com/lando/pantheon/pull/148)
* Solr8 compatibility [#15](https://github.com/lando/pantheon/issues/15)

## v0.7.0 - [December 12, 2022](https://github.com/lando/pantheon/releases/tag/v0.7.0)

* Added bundle-dependencies to release process.
* Fixed bug in plugin dogfooding test.

## v0.6.0 - [September 7, 2022](https://github.com/lando/pantheon/releases/tag/v0.6.0)

* HYPERDRIVED

## v0.5.9 - [April 21, 2022](https://github.com/lando/pantheon/releases/tag/v0.5.9)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Upgrade 8.0 image to use Terminus 3.0.7

## v0.5.8 - [April 13, 2022](https://github.com/lando/pantheon/releases/tag/v0.5.8)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Update Redis config to use redis:6 for M1 Mac users. [PR #108](https://github.com/lando/pantheon/pull/108)
* Match pantheon varnish max header [#109](https://github.com/lando/pantheon/issues/109)

## RELEASED

## v0.5.7 - [February 11, 2022](https://github.com/lando/pantheon/releases/tag/v0.5.7)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Adjust functionality for pushing keys on various sources for lando init

## v0.5.6 - [February 2, 2022](https://github.com/lando/pantheon/releases/tag/v0.5.6)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Update terminus to 3.0.4 in php 8.0 image [PR #100](https://github.com/lando/pantheon/pull/100)
* Fix typo in README [PR #99](https://github.com/lando/pantheon/pull/99)
* Add the no-interaction flag to composer global require commands [PR #98](https://github.com/lando/pantheon/pull/98)

## v0.5.5 - [December 10, 2021](https://github.com/lando/pantheon/releases/tag/v0.5.5)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Empty release to rebuild on npm

## v0.5.4 - [December 9, 2021](https://github.com/lando/pantheon/releases/tag/v0.5.4)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Add mariadb to Pantheon integration. [#16](https://github.com/lando/pantheon/issues/16)

## v0.5.3 - [December 9, 2021](https://github.com/lando/pantheon/releases/tag/v0.5.3)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Update builder.js to use gen4 tags

## v0.5.2 - [December 8, 2021](https://github.com/lando/pantheon/releases/tag/v0.5.2)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Fixed issues with the `switch` command [#13](https://github.com/lando/pantheon/issues/13)

## v0.5.1 - [December 7, 2021](https://github.com/lando/pantheon/releases/tag/v0.5.1)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* Added in php8.0 support [#5](https://github.com/lando/pantheon/issues/5)
* Fixed Typo in Doc [PR#84](https://github.com/lando/pantheon/pull/84)

## v0.5.0 - [November 12, 2021](https://github.com/lando/pantheon/releases/tag/v0.5.0)

Lando is **free** and **open source** software that relies on contributions from developers like you! If you like Lando then help us spend more time making, updating and supporting it by [contributing](https://github.com/sponsors/lando).

* First release of `pantheon` as an external plugin!
* [lando/lando#3137](https://github.com/lando/lando/issues/3137): Add core Docker MariaDB for ARM (M1 Mac) support
* [pantheon-systems/localdev#266](https://github.com/pantheon-systems/localdev/issues/266): Default MariaDB to 10.3, 10.4 and 10.1 available.
