# docker build -t devwithlando/pantheon-appserver:8.3-5 .

FROM devwithlando/php:8.3-fpm-5

# Version information
ENV LANDO_TERMINUS_VERSION=4.1.1
ENV TIKA_VERSION=1.18

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

# Install the additional things that make the pantheon
RUN mkdir -p /usr/share/man/man1 \
  && apt-get update && apt-get install -y \
    openjdk-17-jdk \
  && rm -f /usr/local/etc/php/conf.d/*-memcached.ini \
  && mkdir -p /var/www/.drush \
  && mkdir -p /var/www/.backdrush \
  && mkdir -p /var/www/.composer \
  && mkdir -p /var/www/.drupal \
  && mkdir -p /srv/bin \
  && chown -R www-data:www-data /var/www /srv/bin \
  && wget "https://github.com/pantheon-systems/terminus/releases/download/${LANDO_TERMINUS_VERSION}/terminus.phar" -O /usr/local/bin/terminus \
  && chmod +x /usr/local/bin/terminus \
  && wget "http://archive.apache.org/dist/tika/tika-app-${TIKA_VERSION}.jar" -O /srv/bin/tika-app-${TIKA_VERSION}.jar \
  && chmod +x /srv/bin/tika-app-${TIKA_VERSION}.jar \
  && wget "http://archive.apache.org/dist/tika/tika-app-1.21.jar" -O /srv/bin/tika-app-1.21.jar \
  && chmod +x /srv/bin/tika-app-1.21.jar

RUN install-php-extensions \
  igbinary \
  tidy \
  zstd

# Reinstall PhpRedis extension with igbinary support
RUN \
  rm -f /usr/local/etc/php/conf.d/docker-php-ext-redis.ini \
  && pecl uninstall redis \
  && install-php-extensions redis

RUN apt-get -y clean \
  && apt-get -y autoclean \
  && apt-get -y autoremove \
  && rm -rf /var/lib/apt/lists/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*
