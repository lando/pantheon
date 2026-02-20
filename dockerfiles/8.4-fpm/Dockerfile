# docker build -t devwithlando/pantheon-appserver:8.4-5 .

FROM devwithlando/php:8.4-fpm-5

# Version information
ENV LANDO_TERMINUS_VERSION=4.1.1
ENV TIKA_VERSION=1.18
ENV IMAGEMAGICK_VERSION=7.1.1-43

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

# Install ImageMagick 7 from source to match Pantheon's PHP 8.4 environment
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libde265-dev \
    libheif-dev \
    libjpeg62-turbo-dev \
    libltdl-dev \
    libopenexr-dev \
    libopenjp2-7-dev \
    libpng-dev \
    libtiff-dev \
    libwebp-dev \
    libxml2-dev \
    pkg-config \
  && cd /tmp \
  && wget -q "https://github.com/ImageMagick/ImageMagick/archive/refs/tags/${IMAGEMAGICK_VERSION}.tar.gz" -O imagemagick.tar.gz \
  && tar xzf imagemagick.tar.gz \
  && cd "ImageMagick-${IMAGEMAGICK_VERSION}" \
  && ./configure --with-modules --with-heic --with-webp --with-openjp2 \
  && make -j"$(nproc)" \
  && make install \
  && ldconfig \
  && cd / && rm -rf /tmp/ImageMagick-* /tmp/imagemagick.tar.gz \
  && apt-get purge -y build-essential \
  && apt-get autoremove -y

# Reinstall imagick PHP extension against ImageMagick 7
RUN rm -f /usr/local/etc/php/conf.d/*imagick* \
  && install-php-extensions imagick

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
