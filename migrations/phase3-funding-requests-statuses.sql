-- Phase 3 — Machine à états "Demandes" (grille A, D1/D2/D13/D14)
-- Base : funders
-- Élargit funding_requests_status_enum de [RECEIVED, UNDER_REVIEW, FUNDED, REJECTED, CANCELLED]
-- vers [DRAFT, DOCUMENTS_PENDING, INTERNAL_VALIDATION, CORRECTIONS_REQUESTED, READY_TO_SUBMIT,
--       SUBMITTED, UNDER_REVIEW, COMPLEMENTS_REQUESTED, ACCEPTED, REJECTED, ABANDONED]
-- avec remappage des anciennes valeurs (TypeORM synchronize ne sait pas renommer des valeurs d'enum).

ALTER TYPE funding_requests_status_enum RENAME TO funding_requests_status_enum_old;

CREATE TYPE funding_requests_status_enum AS ENUM (
  'DRAFT',
  'DOCUMENTS_PENDING',
  'INTERNAL_VALIDATION',
  'CORRECTIONS_REQUESTED',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'COMPLEMENTS_REQUESTED',
  'ACCEPTED',
  'REJECTED',
  'ABANDONED'
);

-- Le défaut existant ('RECEIVED' sur l'ancien type) bloque le cast : on le retire d'abord.
ALTER TABLE funding_requests ALTER COLUMN status DROP DEFAULT;

-- Remappage : RECEIVED → SUBMITTED (dossier déposé), FUNDED → ACCEPTED, CANCELLED → ABANDONED.
ALTER TABLE funding_requests
  ALTER COLUMN status TYPE funding_requests_status_enum
  USING (
    CASE status::text
      WHEN 'RECEIVED'  THEN 'SUBMITTED'
      WHEN 'FUNDED'    THEN 'ACCEPTED'
      WHEN 'CANCELLED' THEN 'ABANDONED'
      ELSE status::text
    END
  )::funding_requests_status_enum;

ALTER TABLE funding_requests
  ALTER COLUMN status SET DEFAULT 'DRAFT'::funding_requests_status_enum;

DROP TYPE funding_requests_status_enum_old;

-- Les nouvelles colonnes (deadline, statusChangedAt, escalationLevel, escalatedAt,
-- sourceMaj) et tables (transition_logs, organization_settings) sont créées par
-- TypeORM synchronize au démarrage du service (DB_SYNCHRONIZE=true en dev).