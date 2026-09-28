#!/bin/bash
set -e
printf 'auth %s\n' "$*" >> "$MOCK_LOG"
