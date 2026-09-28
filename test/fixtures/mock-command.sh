#!/bin/bash
set -e

command="${0##*/}"
printf '%s %s\n' "$command" "$*" >> "$MOCK_LOG"
case "$command" in
  mysql)
    case "$*" in
      *'SHOW TABLES'*) printf 'Tables_in_pantheon\nusers\n' ;;
      *) printf 'mysql stdin: %s\n' "$(cat)" >> "$MOCK_LOG" ;;
    esac
    ;;
  mysqldump) printf 'SELECT 1;\n' ;;
  pv|gunzip) cat ;;
esac
