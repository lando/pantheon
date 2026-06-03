# docker build -t devwithlando/pantheon-index:9.10-1 .

FROM solr:9.10.1

# replace default configset with correct solr9 drupal config
ENV SOLR_DOWNLOAD="https://ftp.drupal.org/files/projects/search_api_solr-4.x-dev.tar.gz"
ENV SOLR_DEFAULT_CONFIGSET_DIR=/opt/solr/server/solr/configsets/_default/conf
RUN wget -qO- $SOLR_DOWNLOAD | tar xvz -C /tmp

USER root
RUN mv /tmp/search_api_solr/jump-start/solr9/config-set/* $SOLR_DEFAULT_CONFIGSET_DIR

# Enable analysis-extras module (provides ICUCollationField required by search_api_solr configset)
ENV SOLR_MODULES=analysis-extras
