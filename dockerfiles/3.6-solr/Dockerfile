# docker build -t devwithlando/pantheon-index:3.6-4 .

FROM debian:stretch-slim

# Versions
ENV SOLR_VERSION 3.6.2

# Build out solr on tomcat8
RUN \
  echo "deb http://archive.debian.org/debian stretch main non-free contrib" > /etc/apt/sources.list \
  && echo "deb http://archive.debian.org/debian/ stretch-backports main non-free contrib" >> /etc/apt/sources.list \
  && echo "deb http://archive.debian.org/debian/ stretch-backports-sloppy main non-free contrib" >> /etc/apt/sources.list \
  && echo "deb-src http://archive.debian.org/debian/ stretch main non-free contrib" >> /etc/apt/sources.list \
  && apt-get update && apt-get -y install \
    curl \
    incron \
    tomcat8 \
    tomcat8-admin \
    libtcnative-1 \
    unzip \
  && cd /tmp && curl -Lk "https://archive.apache.org/dist/lucene/solr/${SOLR_VERSION}/apache-solr-${SOLR_VERSION}.tgz" | tar -zvx \
  && mv /tmp/apache-solr-${SOLR_VERSION}/example/solr /usr/share/solr \
  && unzip /tmp/apache-solr-${SOLR_VERSION}/example/webapps/solr.war -d /usr/share/solr/web \
  && mkdir -p \
    /usr/share/solr/lib \
    /usr/share/solr/data \
    /var/lib/tomcat8/temp \
  && rm /usr/share/solr/conf/schema.xml \
  && ln -s /usr/share/solr/web/index /usr/share/solr/conf/schema.xml \
  && echo "root" >> /etc/incron.allow \
  && echo "/usr/share/solr/web/index IN_MODIFY curl -k https://localhost:449/sites/self/environments/lando/admin/cores?action=RELOAD&core=index" > /etc/incron.d/schema_reload \
  && echo "/usr/share/solr/web IN_CREATE curl -k https://localhost:449/sites/self/environments/lando/admin/cores?action=RELOAD&core=index" > /etc/incron.d/schema_reload \
  && echo "/usr/share/solr/web IN_DELETE curl -k https://localhost:449/sites/self/environments/lando/admin/cores?action=RELOAD&core=index" > /etc/incron.d/schema_reload \
  && apt-get -y clean \
  && apt-get -y autoclean \
  && apt-get -y autoremove \
  && rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

# Copy over our config and scripts
COPY ./start.sh /start.sh
COPY ./index /usr/share/solr/web/index
COPY ./server.xml /etc/tomcat8/server.xml
COPY ./web.xml /etc/tomcat8/web.xml
COPY ./index.xml /etc/tomcat8/Catalina/localhost/sites#self#environments#lando.xml
COPY ./solr.xml /usr/share/solr/solr.xml
COPY ./solrconfig.xml /usr/share/solr/conf/solrconfig.xml

EXPOSE 449
CMD ["/bin/bash", "/start.sh"]
