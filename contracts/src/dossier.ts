/** Référentiel cible "Demandes" (Phase 2, grille A) — 11 statuts métier.
 *  Brouillon → Documents en attente → En validation interne → (Corrections demandées ↺)
 *  → Prêt à soumettre → Soumis → En instruction → (Compléments demandés ↺)
 *  → Accepté / Refusé / Abandonné. */
export type FundingRequestStatus =
  | 'DRAFT' // Brouillon
  | 'DOCUMENTS_PENDING' // Documents en attente
  | 'INTERNAL_VALIDATION' // En validation interne
  | 'CORRECTIONS_REQUESTED' // Corrections demandées
  | 'READY_TO_SUBMIT' // Prêt à soumettre
  | 'SUBMITTED' // Soumis
  | 'UNDER_REVIEW' // En instruction
  | 'COMPLEMENTS_REQUESTED' // Compléments demandés
  | 'ACCEPTED' // Accepté
  | 'REJECTED' // Refusé
  | 'ABANDONED'; // Abandonné

/** Source de mise à jour (décision D13) : pipeline/système ou saisie déclarative. */
export type SourceMaj = 'auto' | 'declaratif';

/** Journal générique des transitions (décision D14) — table `transition_logs`. */
export interface TransitionLog {
  id: string;
  entityType: 'FUNDING_REQUEST' | 'DOCUMENT' | 'VALIDATION' | 'REPORTING';
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: 'user' | 'system';
  actorId: string | null;
  sourceMaj: SourceMaj;
  reason: string | null;
  createdAt: string;
}

/** Référentiel cible "Documents" (grille B) — statut de cycle de vie d'une pièce. */
export type DocumentLifecycleStatus =
  | 'TO_PROVIDE' // À fournir
  | 'UPLOADED' // Uploadé
  | 'OCR_PROCESSING' // En cours d'OCR
  | 'PENDING_VALIDATION' // En attente de validation
  | 'VALIDATED' // Validé
  | 'REJECTED' // Rejeté
  | 'ARCHIVED'; // Archivé (si nouvelle version)

/** Référentiel cible "Validations" (grille C) — le commentaire est obligatoire au rejet (D5). */
export type TargetValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REEXAMINED';

/** Référentiel cible "Reporting" (grille D). */
export type TargetReportingStatus =
  | 'SCHEDULED' // Programmé
  | 'TO_PREPARE' // À préparer (J-30 auto)
  | 'IN_PROGRESS' // En rédaction
  | 'SUBMITTED' // Soumis
  | 'ACCEPTED' // Accepté
  | 'COMPLEMENT_REQUESTED'; // Complément demandé

/** Valeurs SLA par organisation (décision D8) — défauts en base, paramétrables
 *  via PUT /funding-requests/settings (jamais codés en dur dans le code). */
export interface SlaSettings {
  /** Délai de validation d'une pièce (heures) — défaut 72. */
  documentValidationHours: number;
  /** Délai de réponse aux corrections demandées (heures) — défaut 72. */
  correctionsHours: number;
  /** Dossier sans mouvement (jours) — défaut 7. */
  inactivityDays: number;
  /** Délai de réponse aux compléments demandés (heures) — défaut 48 (aligné BR-003). */
  complementsHours: number;
  /** Délai d'escalade d'un reporting (jours) — défaut 3 (J+3). */
  reportingEscalationDays: number;
  /** Seuil de confiance OCR en dessous duquel le document est marqué FAILED (0-1) — défaut 0.7. */
  ocrConfidenceThreshold: number;
}

export const DEFAULT_SLA_SETTINGS: SlaSettings = {
  documentValidationHours: 72,
  correctionsHours: 72,
  inactivityDays: 7,
  complementsHours: 48,
  reportingEscalationDays: 3,
  ocrConfidenceThreshold: 0.7,
};

/** Événement RabbitMQ — exchange "smartfunding.events", routing key "funding-request.status.changed". */
export interface FundingRequestStatusChangedEvent {
  eventId: string;
  eventType: 'FundingRequestStatusChanged';
  occurredAt: string;
  payload: {
    requestId: string;
    projectId: string;
    organizationId: string;
    funderId: string;
    fromStatus: string | null;
    newStatus: FundingRequestStatus;
    sourceMaj: SourceMaj;
  };
}