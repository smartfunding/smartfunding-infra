import type { SourceMaj } from './dossier';

export type ApprovalCircuitType = 'SIMPLE' | 'PARALLELE' | 'SEQUENTIEL' | 'HYBRIDE';
export type SubmissionStatus =
  | 'PREPARING' | 'INTERNAL_VALIDATION' | 'SUBMITTED' | 'TRACKING'
  | 'SIGNATURE_PENDING' | 'FUNDED' | 'REJECTED' | 'CANCELLED';

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'PENDING';
export type ApprovalAggregationRule = 'UNANIMITY' | 'MAJORITY';

export interface ApprovalCircuitStep {
  /** Rôle (cf. common.ts `Role`) ou userId : l'étape est satisfaite si n'importe quel membre
   *  du rôle approuve, OU si l'utilisateur précis approuve (exactement l'un des deux doit être renseigné). */
  role?: string;
  userId?: string;
}

export interface ApprovalCircuitConfig {
  organizationId: string;
  type: ApprovalCircuitType;
  /** Circuit séquentiel : ordre des étapes. Circuit parallèle : ensemble sollicité simultanément.
   *  Circuit hybride : [étapes parallèles..., étape finale séquentielle]. Circuit simple : une seule étape. */
  steps: ApprovalCircuitStep[];
  /** Règle d'agrégation pour PARALLELE (défaut UNANIMITY). */
  aggregationRule?: ApprovalAggregationRule;
  /** Délai d'escalade si une étape reste sans décision (heures, défaut 72h). */
  escalationAfterHours?: number;
}

export interface SubmissionApproval {
  userId: string;
  decision: ApprovalDecision;
  decidedAt: string | null;
  /** Commentaire optionnel du validateur. */
  comment?: string;
}

/** Synthèse IA du dossier (POST /ai/dossier/impression) — vue réduite attachée à la
 *  soumission pour l'approbation : le validateur dispose du score sans refaire le calcul. */
export interface AiDossierQuality {
  score: number;
  outcome: 'high' | 'medium' | 'low';
  model: string;
  features: {
    completeness: number;
    budget_coherence: number;
    history: number;
    nb_sections_filled: number;
  };
  generatedAt: string;
}

export interface SubmissionState {
  submissionId: string;
  projectId: string;
  funderId: string;
  organizationId: string;
  status: SubmissionStatus;
  circuitType: ApprovalCircuitType;
  approvals: SubmissionApproval[];
  /** Score de qualité IA du dossier calculé en phase PREPARING (null si service AI indisponible). */
  aiQuality?: AiDossierQuality;
  /** Statut de suivi auprès du financeur (phase TRACKING). */
  funderStatus?: string;
  /** Raison en cas de REJECTED/CANCELLED. */
  reason?: string;
  startedAt: string;
  updatedAt: string;
}

/** Corps de POST /workflow/submissions — déclenche SubmissionWorkflow. */
export interface StartSubmissionRequest {
  projectId: string;
  funderId: string;
  organizationId: string;
  /** Clé d'idempotence API : une même demande avec le même `idempotencyKey` ne déclenche qu'un seul workflow. */
  idempotencyKey?: string;
}

/** Signal d'approbation envoyé par l'API (POST /workflow/submissions/:id/approve|reject). */
export interface ApprovalSignal {
  userId: string;
  /** Rôle vérifié par l'API via /auth/verify avant émission (mitigation threat 8.1.1). */
  role?: string;
  submissionId: string;
  decision: 'APPROVED' | 'REJECTED';
  comment?: string;
  /** Timestamp émis par l'API après vérification du token/role (mitigation threat 8.1.1). */
  emittedAt: string;
}

export type ReportType = 'QUARTERLY' | 'ANNUAL' | 'MILESTONE';
/** Référentiel cible Reporting (décision D7) : Programmé → À préparer (J-30 auto)
 *  → En rédaction → Soumis → Accepté / Complément demandé. */
export type ReportingStatus =
  | 'SCHEDULED' // Programmé
  | 'TO_PREPARE' // À préparer
  | 'IN_PROGRESS' // En rédaction
  | 'SUBMITTED' // Soumis
  | 'ACCEPTED' // Accepté
  | 'COMPLEMENT_REQUESTED'; // Complément demandé

export interface ReportingCalendarEntry {
  submissionId: string;
  projectId: string;
  organizationId: string;
  /** ISO 8601 — échéance corrigée de la marge de sécurité (deadline - 24h). */
  deadline: string;
  /** Échéance brute annoncée par le financeur. */
  rawDeadline: string;
  reportType: ReportType;
  status: ReportingStatus;
  /** Source de mise à jour (décision D13) : pipeline auto ou saisie déclarative. */
  sourceMaj: SourceMaj;
}

/** Retour de GET /workflow/projects/:id/reporting-calendar */
export interface ReportingCalendar {
  projectId: string;
  organizationId: string;
  entries: ReportingCalendarEntry[];
}

export interface ExperienceFeedback {
  submissionId: string;
  projectId: string;
  organizationId: string;
  funderId: string;
  /** Ce qui a fonctionné / difficultés rencontrées (retour structuré libre). */
  positives: string[];
  difficulties: string[];
  /** Score de satisfaction 1-5. */
  rating: number;
  createdAt: string;
}

/** Événement RabbitMQ — exchange "workflow.events" */
export interface SubmissionStatusChangedEvent {
  eventId: string;
  eventType: 'SubmissionStatusChanged';
  occurredAt: string;
  payload: { submissionId: string; projectId: string; newStatus: SubmissionStatus };
}

/** Événement RabbitMQ — exchange "smartfunding.events", routing key "reporting.deadline.approaching" */
export interface ReportingDeadlineApproachingEvent {
  eventId: string;
  eventType: 'ReportingDeadlineApproaching';
  occurredAt: string;
  payload: {
    submissionId: string;
    projectId: string;
    organizationId: string;
    deadline: string; // ISO 8601 — échéance du reporting financeur
    reportType: string;
  };
}

/** Événement RabbitMQ — exchange "workflow.events", routing key "submission.cancelled" (compensation Saga). */
export interface SubmissionCancelledEvent {
  eventId: string;
  eventType: 'SubmissionCancelled';
  occurredAt: string;
  payload: {
    submissionId: string;
    projectId: string;
    organizationId: string;
    reason: string;
  };
}
