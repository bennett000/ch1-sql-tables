FROM ubuntu:14.04

RUN sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib
COPY ./bootstrap.sql /
COPY ./start.sh /usr/local/bin
COPY ./pg_hba.conf /etc/postgresql/9.3/main/pg_hba.conf
COPY ./postgresql.conf /etc/postgresql/9.3/main/postgresql.conf
RUN sudo service postgresql start && sudo -u postgres psql < /bootstrap.sql && sudo service postgresql restart

EXPOSE 5432
# CMD ["/usr/local/bin/start.sh"]
