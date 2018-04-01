CREATE USER sql_tables_example WITH PASSWORD 'this-is-dev';
CREATE DATABASE sql_tables_example
    OWNER sql_tables_example TEMPLATE template0 ENCODING 'UTF8';

GRANT ALL PRIVILEGES ON DATABASE sql_tables_example TO sql_tables_example;
