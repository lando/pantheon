#!/bin/bash
set -euo pipefail

# Exercise the exact helper used by pull/push, inside the recipe's appserver.
# These arguments are deliberately restricted to the local database hostname.
source /helpers/pantheon-local-database.sh
export LANDO_DB_SERVICE_TYPE=mysql:8.4
pantheon_local_database_args mysql
mysql_args=("${PANTHEON_LOCAL_DATABASE_ARGS[@]}")
pantheon_local_database_args mysqldump
dump_args=("${PANTHEON_LOCAL_DATABASE_ARGS[@]}")
[[ " ${dump_args[*]} " == *' --no-tablespaces '* ]]

# MariaDB 11's self-signed local TLS path must get the compatibility argument.
for client in mysql mysqldump; do
  version=$("$client" --version)
  printf '%s\n' "$version"
  if [[ "$version" == *MariaDB* ]]; then
    help=$("$client" --no-defaults --help)
    if grep -Eq '^[[:space:]]+--ssl-verify-server-cert([=[:space:]]|$)' <<< "$help"; then
      pantheon_local_database_args "$client"
      [[ " ${PANTHEON_LOCAL_DATABASE_ARGS[*]} " == *' --ssl-verify-server-cert=0 '* ]]
    fi
  fi
done

dump=$(mktemp)
trap 'rm -f "$dump"' EXIT
mysqldump "${dump_args[@]}" -h database -u pantheon -ppantheon --default-character-set=utf8mb4 \
  --single-transaction pantheon > "$dump"
test -s "$dump"
grep -q 'INSERT INTO `mysql84_example`' "$dump"
php /app/verify.php empty
mysql "${mysql_args[@]}" -h database -u pantheon -ppantheon --default-character-set=utf8mb4 pantheon < "$dump"
php /app/verify.php rows
