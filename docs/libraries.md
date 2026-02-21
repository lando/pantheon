---
title: External Libraries
description: Learn how to work with External Libraries within the Lando Pantheon recipe.
---

# External Libraries

Lando supports [external libraries](https://docs.pantheon.io/external-libraries) available on Pantheon's Gen 2 runtime.

## Tika

Apache Tika is available for text extraction.

### Tika 1.x (Default)

Tika 1.18 and 1.21 are pre-installed:
- `/srv/bin/tika-app-1.18.jar`
- `/srv/bin/tika-app-1.21.jar`

**Note:** Tika 1.x will no longer be available on Pantheon starting January 19, 2026.

### Tika 3 (Recommended)

For PHP Runtime Generation 2, you can enable Tika 3 by adding to your `pantheon.yml`:

```yaml
tika_version: 3
```

When enabled, Tika 3 will be available at `/opt/pantheon/tika/tika.jar`.

### Tooling Configuration

Add Tika as a tooling command in your Landofile:

```yaml
tooling:
  # For Tika 1.x
  tika:
    service: appserver
    cmd: java -jar /srv/bin/tika-app-1.18.jar

  # For Tika 3
  tika:
    service: appserver
    cmd: java -jar /opt/pantheon/tika/tika.jar
```
