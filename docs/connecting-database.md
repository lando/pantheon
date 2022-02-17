---
title: Connecting to your database
description: Learn how to connect to your Pantheon database in Lando.
guide: true
mailchimp:
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  title: Want more Pantheon guide content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

Just like Pantheon, Lando will automatically configure your application to connect to its local database.

You can also check out the environment variable called [`LANDO INFO`](https://docs.lando.dev/guides/lando-info.html) as it contains useful information about how your application can access other Lando services.

If you find that you still cannot connect to your database, which can happen if a local `wp-config.php` or `settings.local.php` is hijacking our automation, the default credentials are below:

Note that the `host` is not `localhost` but `database`.

```yaml
database: pantheon
username: pantheon
password: pantheon
host: database
port: 3306
```

You can get also get the above information, and more, by using the [`lando info`](https://docs.lando.dev/cli/info.html) command.
