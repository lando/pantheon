'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const SUPPORTED_MAJORS = [22, 24, 26];
const DEFAULT_NODE_VERSION = '26';
const DEFAULT_BUILD_COMMAND = 'build';
const LOCKFILES = [
  {manager: 'bun', files: ['bun.lock', 'bun.lockb']},
  {manager: 'pnpm', files: ['pnpm-lock.yaml']},
  {manager: 'yarn', files: ['yarn.lock']},
  {manager: 'npm', files: ['package-lock.json']},
];
const INSTALL_FLAGS = {
  bun: 'install --frozen-lockfile',
  pnpm: 'install --frozen-lockfile',
  yarn: 'install --frozen-lockfile',
  npm: 'ci',
};
const BOOTSTRAP = {
  yarn: 'command -v yarn >/dev/null 2>&1 || npm install --global yarn',
  pnpm: 'command -v pnpm >/dev/null 2>&1 || npm install --global pnpm',
  bun: 'command -v bun >/dev/null 2>&1 || npm install --global bun',
};

const shQuote = value => `'${String(value).replace(/'/g, `'\\''`)}'`;

const asEntry = entry => {
  if (_.isString(entry)) return {path: entry};
  return _.isPlainObject(entry) ? entry : {};
};

const majorOf = version => parseInt(String(version).split('.')[0], 10);

const normalizeEntry = entry => {
  const raw = asEntry(entry);
  const relPath = _.trim(_.toString(raw.path || ''));
  if (!relPath) {
    throw new Error('frontend_build path is missing');
  }
  const nodeVersion = _.toString(raw.node_version || DEFAULT_NODE_VERSION);
  const major = majorOf(nodeVersion);
  if (!SUPPORTED_MAJORS.includes(major)) {
    throw new Error(`${relPath}: node_version ${nodeVersion} is not supported. Use 22, 24, or 26.`);
  }
  return {
    path: relPath,
    nodeVersion,
    major,
    buildCommand: _.toString(raw.build_command || DEFAULT_BUILD_COMMAND),
  };
};

const collectPaths = docs => {
  const byPath = new Map();
  _.forEach(docs, doc => {
    _.forEach(_.get(doc, 'frontend_build.paths', []), entry => {
      const normalized = normalizeEntry(entry);
      byPath.set(normalized.path, normalized);
    });
  });
  return [...byPath.values()];
};

const parseFrontendBuild = docs => {
  const paths = collectPaths(docs);
  if (_.isEmpty(paths)) return null;

  const majors = _.uniq(paths.map(item => item.major));
  if (majors.length > 1) {
    const detail = paths.map(item => `${item.path} (node ${item.nodeVersion})`).join(', ');
    throw new Error(`frontend_build paths request mixed Node majors. Use one major. ${detail}`);
  }

  return {
    nodeVersion: String(majors[0]),
    paths,
  };
};

const detectPackageManager = dir => {
  for (const {manager, files} of LOCKFILES) {
    if (files.some(file => fs.existsSync(path.join(dir, file)))) {
      return manager;
    }
  }
  return null;
};

const resolveFrontendBuild = (parsed, appRoot) => {
  if (!parsed) return null;
  const paths = parsed.paths.map(item => {
    const absPath = path.resolve(appRoot, item.path);
    const manager = detectPackageManager(absPath);
    if (!manager) {
      throw new Error(`${item.path}: no lockfile. Commit bun.lock, bun.lockb, pnpm-lock.yaml, yarn.lock, or package-lock.json.`);
    }
    return {...item, manager, absPath};
  });
  return {
    nodeVersion: parsed.nodeVersion,
    paths,
  };
};

const bootstrapCommands = plan => _(plan.paths)
  .map(item => BOOTSTRAP[item.manager])
  .compact()
  .uniq()
  .value();

const pathCommands = plan => plan.paths.map(item => {
  const workdir = path.posix.join('/app', item.path.split(path.sep).join('/'));
  return [
    `cd ${shQuote(workdir)}`,
    `${item.manager} ${INSTALL_FLAGS[item.manager]}`,
    `${item.manager} run ${shQuote(item.buildCommand)}`,
  ].join(' && ');
});

const getBuildCommands = plan => bootstrapCommands(plan).concat(pathCommands(plan));

const getPantheonFrontend = plan => {
  const tooling = {
    'node': {service: 'frontend', cmd: 'node'},
    'npm': {service: 'frontend', cmd: 'npm'},
    'yarn': {service: 'frontend', cmd: 'yarn'},
    'pnpm': {service: 'frontend', cmd: 'pnpm'},
    'bun': {service: 'frontend', cmd: 'bun'},
    'frontend-build': {
      service: 'frontend',
      cmd: getBuildCommands(plan).join(' && '),
    },
  };
  return {
    services: {
      frontend: {
        type: `pantheon-node:${plan.nodeVersion}`,
        build: getBuildCommands(plan),
      },
    },
    tooling,
  };
};

module.exports = {
  SUPPORTED_MAJORS,
  DEFAULT_NODE_VERSION,
  parseFrontendBuild,
  detectPackageManager,
  resolveFrontendBuild,
  getBuildCommands,
  getPantheonFrontend,
};
