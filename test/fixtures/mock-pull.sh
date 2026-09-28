#!/bin/bash
set -e
printf 'pull %s\n' "$*" >> "$MOCK_LOG"
if [[ "${MOCK_PULL_DELETE_LANDOFILE:-}" == 1 ]]; then
  rm "$LANDO_MOUNT/.lando.yml"
fi
