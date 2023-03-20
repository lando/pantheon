## v0.10.0 - [TBD](https://github.com/lando/pantheon/releases/tag/v0.10.0)

  * Added support for `php` `8.2` [#159](https://github.com/lando/pantheon/issues/159)

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
