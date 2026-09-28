'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const yaml = require('js-yaml');
const frontendBuild = require('./frontend-build');

const DEFAULT_PHP_VERSION = '8.3';
// Pantheon recommends PHP 8.2+ for new sites. Keep this list in sync with
// https://docs.pantheon.io/guides/php/php-versions
const RECOMMENDED_PHP_VERSIONS = ['8.2', '8.3', '8.4', '8.5'];
// Published devwithlando/pantheon-appserver:<php>-<gen> tags. Gen5 tags
// match dockerfiles/*-fpm on main. Older gens stay listed so we can fall
// back instead of pulling a tag that does not exist.
const PHP_GENERATION_IMAGES = {
  '5.3': ['2'],
  '5.5': ['2'],
  '5.6': ['2', '3', '4'],
  '7.0': ['2', '3', '4'],
  '7.1': ['2', '3', '4'],
  '7.2': ['2', '3', '4', '5'],
  '7.3': ['2', '3', '4', '5'],
  '7.4': ['2', '3', '4', '5'],
  '8.0': ['3', '4', '5'],
  '8.1': ['4', '5'],
  '8.2': ['4', '5'],
  '8.3': ['4', '5'],
  '8.4': ['5'],
  '8.5': ['5'],
};

/**
 * Resolves a PHP version + image generation to a published appserver tag.
 * Keeps the requested generation when it exists, otherwise the highest
 * available generation for that PHP version, or null if none exist.
 * @param {string} php - PHP version (e.g. '8.3')
 * @param {string} generation - Requested image generation (e.g. '5')
 * @return {string|null} Generation to use, or null if no images exist
 */
const resolveGeneration = (php, generation) => {
  const available = PHP_GENERATION_IMAGES[php];
  if (!available || available.length === 0) return null;
  if (available.includes(generation)) return generation;
  return available[available.length - 1];
};


/**
 * Normalizes already-parsed pantheon yaml documents.
 * Later documents override earlier ones. Does not read the filesystem.
 *
 * @param {object[]} docs parsed yaml objects
 * @return {object} normalized pantheon config
 */
const parsePantheonConfig = docs => {
  const data = _.merge({}, ...docs);
  data.frontendBuild = frontendBuild.parseFrontendBuild(docs);

  // Set the php version
  data.php = _.toString(_.get(data, 'php_version', DEFAULT_PHP_VERSION));
  // js-yaml parses unquoted x.0 as the integer x (`php_version: 8.0` => 8).
  if (/^\d+$/.test(data.php)) data.php = `${data.php}.0`;
  // Set the webroot
  data.webroot = (_.get(data, 'web_docroot', false)) ? 'web' : '.';
  // Set the drush version. Lando supports Drush 8 and above; if the user
  // requests something lower, warn loudly (rather than silently upgrade) and
  // fall back to 8.
  const requestedDrush = _.toString(_.get(data, 'drush_version', ''));
  data.drush = requestedDrush || '8';
  if (data.drush < 8) {
    console.warn([
      ``,
      `⚠️  WARNING: drush_version: ${requestedDrush} in pantheon.yml is not supported.`,
      `   Lando supports Drush 8 and above; Drush 8 will be used instead.`,
      ``,
    ].join('\n'));
    data.drush = 8;
  }
  // @DEPRECATED: Pantheon php_runtime_generation: 1 is deprecated and will be removed April 2026.
  const phpRuntimeGen = _.get(data, 'php_runtime_generation', 2);
  const requestedGen = phpRuntimeGen === 1 ? '4' : '5';
  const resolvedGen = resolveGeneration(data.php, requestedGen);
  if (resolvedGen === null) {
    console.warn([
      ``,
      `⚠️  WARNING: No Docker images are available for PHP ${data.php}.`,
      `   The appserver will fail to start. Update php_version in your pantheon.yml`,
      `   to a Pantheon-recommended version: ${RECOMMENDED_PHP_VERSIONS.join(', ')}.`,
      ``,
    ].join('\n'));
    data.generation = requestedGen;
  } else if (resolvedGen !== requestedGen) {
    console.warn([
      ``,
      `⚠️  WARNING: No Docker image exists for PHP ${data.php} generation ${requestedGen}.`,
      `   Falling back to devwithlando/pantheon-appserver:${data.php}-${resolvedGen}.`,
      `   For best results, use a Pantheon-recommended PHP version: ${RECOMMENDED_PHP_VERSIONS.join(', ')}.`,
      ``,
    ].join('\n'));
    data.generation = resolvedGen;
  } else {
    data.generation = resolvedGen;
  }
  // Set the tika version if specified in pantheon.yml
  const tikaVersion = _.get(data, 'tika_version');
  if (tikaVersion !== undefined) {
    data.tikaVersion = _.toInteger(tikaVersion);
  }
  return data;
};

/**
 * Loads and normalizes Pantheon YAML configuration files.
 *
 * @param {string[]} [files=['pantheon.upstream.yml', 'pantheon.yml']] yaml files to process
 * @return {object} merged configuration object
 */
const getPantheonConfig = (files = ['pantheon.upstream.yml', 'pantheon.yml']) => {
  const docs = _(files)
    .filter(file => fs.existsSync(file))
    .map(file => yaml.load(fs.readFileSync(file)) || {})
    .value();
  return parsePantheonConfig(docs);
};

module.exports = {
  DEFAULT_PHP_VERSION,
  PHP_GENERATION_IMAGES,
  RECOMMENDED_PHP_VERSIONS,
  resolveGeneration,
  parsePantheonConfig,
  getPantheonConfig,
};
