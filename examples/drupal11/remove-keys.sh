#!/bin/bash

# Get our fingerprint from this test instance.
GET_KEY=$(ssh-keygen -E md5 -lf /lando/keys/pantheon.lando.id_rsa);
FINGERPRINT=$(grep -oP '(?<=MD5:).*?(?=\s)' <<< "$GET_KEY")

# Delete that key.
#
# If the key is already gone from Pantheon (e.g. because a concurrent CI
# run on the same shared landobot account displaced it, or because
# terminus' key listing lagged behind the upload) we still want this
# cleanup step to succeed -- the end-state we care about (no leftover
# key on the account) is already satisfied. We only want to fail on a
# genuine error such as an auth or network problem.
echo "Trying to remove key $FINGERPRINT"
OUTPUT=$(terminus ssh-key:remove "$FINGERPRINT" 2>&1)
STATUS=$?
echo "$OUTPUT"

if [ $STATUS -eq 0 ]; then
  exit 0
fi

if echo "$OUTPUT" | grep -q "Could not find a SSH key"; then
  echo "Key $FINGERPRINT was already gone from Pantheon; treating cleanup as successful."
  exit 0
fi

exit $STATUS
