#!/bin/bash

lando_pink() { printf '[pink] %s\n' "$*"; }
lando_green() { printf '[green] %s\n' "$*"; }
lando_red() { printf '[red] %s\n' "$*"; }
lando_yellow() { printf '[yellow] %s\n' "$*"; }
# push.sh calls error, but core's real logger only defines lando_error.
error() { printf '[error] %s\n' "$*"; exit 1; }
