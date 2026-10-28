#!/bin/bash

# Arguments for connections to the local database service ONLY. Never use these
# with connection commands returned by Terminus (or with arbitrary remote hosts).
# Probe each binary: mysql and mysqldump need not come from the same client suite.
pantheon_local_database_args() {
  local client="$1" version help
  PANTHEON_LOCAL_DATABASE_ARGS=()
  case "${LANDO_DB_SERVICE_TYPE:-}" in
    mysql:8.4|mysql:8.4.*) ;;
    *) return 0 ;;
  esac

  version=$("$client" --version) || return
  if [[ "$version" == *MariaDB* ]]; then
    help=$("$client" --no-defaults --help) || return
    # Capability detection also keeps older PHP images/clients working. Oracle
    # clients must not receive this MariaDB-only option; their TLS defaults work.
    if grep -Eq '^[[:space:]]+--ssl-verify-server-cert([=[:space:]]|$)' <<< "$help"; then
      PANTHEON_LOCAL_DATABASE_ARGS+=(--ssl-verify-server-cert=0)
    fi
  fi

  # MySQL 8.4 requires PROCESS to dump tablespace metadata. Pantheon's local user
  # does not have it; ordinary table/schema/data dumps do not need that metadata.
  if [ "$client" = "mysqldump" ]; then
    PANTHEON_LOCAL_DATABASE_ARGS+=(--no-tablespaces)
  fi
}
