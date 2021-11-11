#!/bin/bash

# Get our fingerprint from this test instance.
GET_KEY=$(ssh-keygen -E md5 -lf /lando/keys/pantheon.lando.id_rsa);
FINGERPRINT=$(grep -oP '(?<=MD5:).*?(?=\s)' <<< "$GET_KEY")

# Delete that key
echo "Trying to remove key $FINGERPRINT"
terminus ssh-key:remove $FINGERPRINT
