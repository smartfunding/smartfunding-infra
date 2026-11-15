#!/bin/bash
# 01-create-dbs.sh — Créé toutes les bases applicatives + temporal au 1er démarrage.
# L'image officielle postgres ne supporte PAS POSTGRES_MULTIPLE_DATABASES :
# c'est ce script (monté dans /docker-entrypoint-initdb.d) qui fait le travail.
set -e

# $POSTGRES_USER = postgres (défini dans le compose)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE auth;
  CREATE DATABASE projects;
  CREATE DATABASE funders;
  CREATE DATABASE workflow;
  CREATE DATABASE billing;
  CREATE DATABASE onboarding;
  CREATE DATABASE temporal;
  CREATE DATABASE temporal_visibility;
EOSQL

echo "Bases SmartFunding créées : auth, projects, funders, workflow, billing, onboarding, temporal, temporal_visibility"
