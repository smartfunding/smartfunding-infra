-- Phase 3 — Reporting cible (D10/D11) : normalisation des statuts du calendrier
-- Base : workflow
-- reporting_calendar_entries.status (varchar) passe de [PENDING, GENERATED, SUBMITTED, CLOSED]
-- à [SCHEDULED, TO_PREPARE, IN_PROGRESS, SUBMITTED, ACCEPTED, COMPLEMENT_REQUESTED].

UPDATE reporting_calendar_entries SET status = 'SCHEDULED'   WHERE status = 'PENDING';
UPDATE reporting_calendar_entries SET status = 'IN_PROGRESS' WHERE status = 'GENERATED';
UPDATE reporting_calendar_entries SET status = 'ACCEPTED'    WHERE status = 'CLOSED';
-- SUBMITTED est inchangé ; TO_PREPARE / COMPLEMENT_REQUESTED sont de nouveaux statuts.