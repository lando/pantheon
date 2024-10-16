# docker build -t devwithlando/pantheon-index:8.8-4 .

FROM solr:8.8.2

# replace default configset with correct solr8 drupal config
ENV SOLR_DOWNLOAD="https://ftp.drupal.org/files/projects/search_api_solr-4.x-dev.tar.gz"
ENV SOLR_DEFAULT_CONFIGSET_DIR=/opt/solr/server/solr/configsets/_default/conf
RUN wget -qO- $SOLR_DOWNLOAD | tar xvz -C /tmp

USER root
RUN mv /tmp/search_api_solr/jump-start/solr8/config-set/* $SOLR_DEFAULT_CONFIGSET_DIR

