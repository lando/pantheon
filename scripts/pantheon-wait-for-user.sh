#!/bin/bash

set -e

# user info
user="${1:-$LANDO_WEBROOT_USER}"
id="${2:-$LANDO_HOST_UID}"

# retry settings
attempt=0
delay=2
retry=100

until [ "$attempt" -ge "$retry" ]
do
  echo "Waiting for user $user with id $id to be created..."
  id -u "$user" | grep "$id" &>/dev/null && break
  attempt=$((attempt+1))
  sleep "$delay"
done
