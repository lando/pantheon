#!/bin/bash
set -e

printf 'terminus %s\n' "$*" >> "$MOCK_LOG"
if [[ -n "${MOCK_TERMINUS_FAIL_ON:-}" && "$*" == *"$MOCK_TERMINUS_FAIL_ON"* ]]; then
  exit 1
fi

case "$1" in
  connection:info)
    case "$*" in
      *--field=mysql_command*) printf 'mysql --host=remote.invalid --user=remote pantheon\n' ;;
      *--field=*) printf 'mock-connection\n' ;;
    esac
    ;;
  env:info) printf 'git\n' ;;
  env:diffstat) printf '[]\n' ;;
  auth:whoami)
    case "$*" in
      *'--field=First Name'*) printf 'Test\n' ;;
      *'--field=Last Name'*) printf 'User\n' ;;
      *) printf 'me@x.test\n' ;;
    esac
    ;;
  remote:drush|remote:wp) printf 'SELECT 1;\n' ;;
  backup:list) printf 'files\n' ;;
esac
