#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

PGDATA="/data/pgdata"
export PGDATA

echo "====================================================="
echo "   Starting Kraft Your Trip Services (PG + Node)     "
echo "====================================================="

# 1. Ensure database directory exists and is owned by the postgres user
echo "Setting up PostgreSQL data directory..."
mkdir -p "$PGDATA"
chown -R postgres:postgres /data || true
chown -R postgres:postgres "$PGDATA" || true
chmod 700 "$PGDATA" || true

# 2. Initialize PostgreSQL if database files are not present
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "Initializing empty database cluster..."
  sudo -u postgres initdb -D "$PGDATA" --auth-local=trust --auth-host=trust
else
  echo "PostgreSQL cluster is already initialized."
fi

# 3. Start PostgreSQL using pg_ctl
echo "Starting PostgreSQL server..."
sudo -u postgres pg_ctl -D "$PGDATA" -o "-h localhost" -l /data/postgres.log start

# 4. Wait for PostgreSQL to become ready
echo "Waiting for database to accept connections..."
for i in {1..30}; do
  if sudo -u postgres pg_isready -h localhost; then
    echo "PostgreSQL is ready!"
    break
  fi
  echo "Database is starting... (attempt $i/30)"
  sleep 1
done

if ! sudo -u postgres pg_isready -h localhost; then
  echo "ERROR: PostgreSQL failed to start in time. Database logs:"
  cat /data/postgres.log || true
  exit 1
fi

# 5. Create application database and import schema if needed
DB_NAME="kraft_your_trip"
echo "Checking if database '$DB_NAME' exists..."
DB_EXISTS=$(sudo -u postgres psql -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" != "1" ]; then
  echo "Database '$DB_NAME' does not exist. Creating it..."
  sudo -u postgres createdb -h localhost "$DB_NAME"
  
  echo "Importing schema from db/schema.sql..."
  sudo -u postgres psql -h localhost -d "$DB_NAME" -f db/schema.sql
  
  echo "Seeding initial data..."
  export DATABASE_URL="postgres://postgres@localhost:5432/$DB_NAME"
  npm run seed
else
  echo "Database '$DB_NAME' already exists. Skipping schema import and seeding."
fi

# 6. Start Node.js backend
echo "Starting Node.js application..."
export DATABASE_URL="postgres://postgres@localhost:5432/$DB_NAME"
export PORT=${PORT:-5000}

# Run the node app in the foreground
exec npm start
