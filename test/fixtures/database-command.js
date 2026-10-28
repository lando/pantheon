#!/usr/bin/env node
'use strict';

// Executed through per-test symlinks. No real Pantheon or database connections.
const fs = require('fs');
const path = require('path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const env = process.env;
const log = entry => fs.appendFileSync(env.TEST_LOG, JSON.stringify({command, args, ...entry}) + '\n');
const fail = key => Number(env[key] || 0);

if (args.includes('--version')) {
  log({probe: true});
  console.log(env[`TEST_${command.toUpperCase()}_VERSION`] || env.TEST_CLIENT_VERSION || 'mysql from 11.4.9-MariaDB, client 15.2');
  process.exitCode = fail('TEST_VERSION_FAIL');
} else if (args.includes('--help')) {
  log({probe: true});
  console.log(env.TEST_CLIENT_SSL === 'false' ? '  --ssl' : '  --ssl-verify-server-cert');
  process.exitCode = fail('TEST_HELP_FAIL');
} else if (command === 'git') {
  console.log('* master');
} else if (command === 'auth.sh') {
  log({});
} else if (command === 'terminus') {
  log({});
  if (args[0] === 'connection:info') {
    console.log('mysql --host=remote "--password=remote secret" --ssl-ca=/remote/ca.pem pantheon');
    process.exitCode = fail('TEST_CONNECTION_FAIL');
  }
} else if (command === 'test-source') {
  log({});
  console.log(env.TEST_SOURCE_FAIL ? 'PRIMARY_PARTIAL' : 'PRIMARY_COMPLETE');
  process.exitCode = fail('TEST_SOURCE_FAIL');
} else if (command === 'mysqldump') {
  const remote = args.includes('--host=remote');
  log({remote});
  console.log(remote ? 'FALLBACK_COMPLETE' : 'LOCAL_COMPLETE');
  process.exitCode = fail(remote ? 'TEST_FALLBACK_FAIL' : 'TEST_DUMP_FAIL');
} else if (command === 'mysql') {
  const remote = args.includes('--host=remote');
  if (args.includes('-e')) {
    log({remote, query: true});
    console.log('users');
    process.exitCode = fail('TEST_QUERY_FAIL');
  } else {
    const input = fs.readFileSync(0, 'utf8');
    const drop = input.includes('DROP TABLE');
    log({remote, input, drop});
    process.exitCode = fail(drop ? 'TEST_DROP_FAIL' : 'TEST_IMPORT_FAIL');
  }
} else if (command === 'pv' || command === 'cat') {
  log({});
  process.stdout.write(fs.readFileSync(args[0]));
  process.exitCode = fail('TEST_PIPE_FAIL');
} else {
  throw new Error(`Unexpected command: ${command}`);
}
