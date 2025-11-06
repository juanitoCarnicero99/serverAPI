#!/usr/bin/env bash
# Simple deploy helper for a Linux host (Hostinger SSH / VPS)
# Usage: upload this file to your server inside the project folder and run:
#   chmod +x deploy.sh
#   ./deploy.sh

set -euo pipefail

echo "Starting deploy script..."

ROOT_DIR="$(pwd)"
echo "Project root: $ROOT_DIR"

if [ -f .env ]; then
  echo "Using .env file present in project root"
  # load .env variables for this script
  export $(grep -v '^#' .env | xargs)
fi

echo "Installing dependencies (production)..."
npm install --production

if [ ! -z "${DATABASE_URL-}" ]; then
  echo "Detected DATABASE_URL. Attempting to run SQL migrations if psql is available..."
  if command -v psql >/dev/null 2>&1; then
    if [ -f 001_create_users_table.sql ]; then
      echo "Running 001_create_users_table.sql against DATABASE_URL"
      psql "$DATABASE_URL" -f 001_create_users_table.sql || echo "psql returned non-zero (it may be ok if table exists)"
    else
      echo "No 001_create_users_table.sql present, skipping migration"
    fi
  else
    echo "psql not found on system. Skipping automatic migration. Run the migration manually or ensure DB has correct schema."
  fi
else
  echo "No DATABASE_URL set — using local SQLite (data.db)"
fi

echo "Starting application..."
# Prefer using pm2 if available
if command -v pm2 >/dev/null 2>&1; then
  echo "Starting with pm2 (app name: flutter-mvc-login-api)"
  pm2 start index.js --name flutter-mvc-login-api --update-env --time
else
  echo "pm2 not found — launching with node in background"
  nohup node index.js > server_log.txt 2> server_err.txt &
  echo "Launched node with nohup — check server_log.txt for output"
fi

echo "Deploy script finished."
