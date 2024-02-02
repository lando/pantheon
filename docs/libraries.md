---
title: External Libraries
description: Learn how to work with External Libraries within the Lando Pantheon recipe.
---

# External Libraries

Lando also supports the same [external libraries](https://pantheon.io/docs/external-libraries/) as Pantheon so you can use Lando to test code that uses `phantomjs`, `wkhtmltopdf`, `tika` and more.

If you'd like to utilize these libraries as [tooling commands](https://docs.lando.dev/core/v3/tooling.html), add to the `tooling` section of your Landofile as shown below:

```yaml
phantomjs:
  service: appserver
  cmd: /srv/bin/phantomjs
wkhtmltopdf:
  service: appserver
  cmd: /srv/bin/wkhtmltopdf
tika:
  service: appserver
  cmd: java -jar /srv/bin/tika-app-1.1.jar
```