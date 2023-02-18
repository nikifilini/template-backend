set -e
set -u

function create_user_and_database() {
	local database=$1
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  DO \$\$
  BEGIN
    IF EXISTS (
        SELECT FROM pg_catalog.pg_roles
        WHERE  rolname = '$database') THEN

        RAISE NOTICE 'Role $database already exists. Skipping.';
    ELSE
        RAISE NOTICE 'Creating user and database $database';
        create extension if not exists dblink;
        CREATE USER $database WITH PASSWORD '$database';
        PERFORM dblink_exec('dbname=' || current_database()   -- current db
                      , 'CREATE DATABASE $database');
        GRANT ALL PRIVILEGES ON DATABASE $database TO $database;
    END IF;
  END
  \$\$;
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
		create_user_and_database $db
	done
	echo "Multiple databases created"
fi