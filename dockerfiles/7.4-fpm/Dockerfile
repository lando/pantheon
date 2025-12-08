# docker build -t devwithlando/pantheon-appserver:7.4-5 .

FROM devwithlando/php:7.4-fpm-5

# Version information
ENV LANDO_TERMINUS_VERSION=4.1.1
ENV TIKA_VERSION=1.18

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

# MariaDB client compatibility (https://github.com/lando/php/issues/120)
RUN mkdir -p /etc/apt/keyrings \
  && curl -o /etc/apt/keyrings/mariadb-keyring.pgp 'https://mariadb.org/mariadb_release_signing_key.pgp' \
  && echo "deb [signed-by=/etc/apt/keyrings/mariadb-keyring.pgp] https://archive.mariadb.org/repo/10.5/debian bullseye main" > /etc/apt/sources.list.d/mariadb.list

# Install the additional things that make the pantheon
RUN mkdir -p /usr/share/man/man1 \
  && apt-get update && apt-get install -y \
    openjdk-11-jdk \
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

RUN apt-get -y clean \
  && apt-get -y autoclean \
  && apt-get -y autoremove \
  && rm -rf /var/lib/apt/lists/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*
