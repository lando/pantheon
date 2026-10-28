#!/bin/bash
set -euo pipefail

# This path is mounted at /app in the database container by the actual recipe.
dump=.mysql84-roundtrip.sql
trap 'rm -f "$dump" "$dump.gz"' EXIT
lando php verify.php rows
lando db-export "$dump"
test -s "$dump.gz"
gzip -cd "$dump.gz" | grep 'INSERT INTO `mysql84_example`'
lando php verify.php empty
lando db-import "$dump.gz"
lando php verify.php rows
