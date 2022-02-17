---
title: Utilizing WordPress Site Network Support (Experimental)
description: Learn how to utilize WordPress site network support in Pantheon Lando setup.
guide: true
mailchimp:
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  title: Want more Pantheon guide content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

Lando supports WordPress site networks both in folder and sub-domain configuration. At this time, this feature is considered experimental, so there may be edge cases and Gremlins to shake out.

Make sure to first read [Pantheon's site network documentation](https://pantheon.io/docs/guides/multisite) and then consider the following edits you probably need to make to your `wp-config.php`:

```php
if ( ! empty( $_ENV['PANTHEON_ENVIRONMENT'] ) ) {
  switch( $_ENV['PANTHEON_ENVIRONMENT'] ) {
    case 'live':
      // Value should be the primary domain for the Site Network.
      define( 'DOMAIN_CURRENT_SITE', 'live-<site>.pantheonsite.io' );
      // Once you map a domain to Live, you can change DOMAIN_CURRENT_SITE
      // define( 'DOMAIN_CURRENT_SITE', 'example-network.com' );
      break;
    case 'test':
      define( 'DOMAIN_CURRENT_SITE', 'test-<site>.pantheonsite.io' );
      break;
    case 'dev':
      define( 'DOMAIN_CURRENT_SITE', 'dev-<site>.pantheonsite.io' );
      break;
    // PAY ATTENTION TO THIS CASE LANDO USER!
    case 'lando':
      define( 'DOMAIN_CURRENT_SITE', 'app-name.lndo.site' );
      break;
    default:
      # Catch-all to accommodate default naming for multi-dev environments.
      define( 'DOMAIN_CURRENT_SITE', $_ENV['PANTHEON_ENVIRONMENT'] . '-' . $_ENV['PANTHEON_SITE_NAME'] . '.pantheonsite.io' );
      break;
    }
}
```

In the above code snippet, we're adding a special case when `$_ENV['PANTHEON_ENVIRONMENT']` is set to `lando`. We do this because Lando uses a different domain scheme than Pantheon, and if we don't set this case, your Lando site will redirect to `lando-site-name.pantheonsite.io` causing much confusion.

Additionally, if you use the _sub-domain_ variation of the WordPress site network system, you'll need to add custom proxy routes to your `.lando.yml` like so:

```yml
name: landobot-network-domain
recipe: pantheon
config:
  framework: wordpress_network
  site: landobot-network-domain
  id: lolzimauuidstring
proxy:
  edge:
    - landobot-network-domain.lndo.site
    - site1.landobot-network-domain.lndo.site
    - site2.landobot-network-domain.lndo.site
```

Note that you have to re-add the default domain as well.

A special note: WordPress site networks require you to pass a few special flags to pretty much all WP-CLI commands: `--url="http://urlofmainsiteindatabase" --network`

it gets really annoying, and has even caused some workflows to fail on Pantheon in the past. See the troubleshooting and workflow sections from the Pantheon docs linked above for some examples of this. Lando tries to do this automatically for you when we run the pull command, but if you are having issues, you may need to manually run the wp-cli search-replace command with the network and url flags and closely inspect the output to troubleshoot.


