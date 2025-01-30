'use strict';

// Modules
const _ = require('lodash');
const auth = require('./auth');
const utils = require('./utils');

// The non dynamic base of the task
const task = {
  service: 'appserver',
  description: 'Switch to a different multidev environment',
  cmd: '/helpers/switch.sh',
  level: 'app',
  stdio: ['inherit', 'pipe', 'pipe'],
  options: {
    'auth': {
      describe: 'Pantheon machine token',
      passthrough: true,
      string: true,
      interactive: {
        type: 'list',
        message: 'Choose a Pantheon account',
        choices: [],
        when: () => false,
        weight: 100,
      },
    },
    'env': {
      description: 'The environment to which we will switch',
      passthrough: true,
      alias: ['e'],
      interactive: {
        type: 'list',
        message: 'Switch environment to?',
        weight: 610,
      },
    },
    'no-db': {
      description: 'Do not switch the database',
      boolean: true,
      default: false,
    },
    'no-files': {
      description: 'Do not switch the files',
      boolean: true,
      default: false,
    },

  },
};

// Helper to populate interactive opts
const getDefaults = (task, options) => {
  _.forEach(['env'], name => {
    task.options[name].interactive.choices = answers => {
      return utils.getPantheonInquirerEnvs(
      answers.auth,
      options.id,
      ['test', 'live'],
      options._app.log);
    };
    task.options[name].interactive.default = options.env;
  });

  // Get the framework flavor
  const flavor = utils.frameworkType(options.framework);
  const pullCommand = utils.buildDbPullCommand(options);
  // Set envvars
  task.env = {
    // These LANDO_DB_PULL_* vars are separate because
    // integrations/lando-pantheon/scripts/pull.sh needs to concatenate the
    // specified <site.env> between them.
    LANDO_DB_PULL_COMMAND: pullCommand.command,
    LANDO_DB_PULL_COMMAND_OPTIONS: pullCommand.options,
    LANDO_DB_USER_TABLE: flavor === 'pressy' ? 'wp_users' : 'users',
  };

  return task;
};

/*
 * Helper to build a pull command
 */
exports.getPantheonSwitch = (options, tokens = []) => {
  return _.merge({}, getDefaults(task, options), {options: auth.getAuthOptions(options._app.meta, tokens)});
};
