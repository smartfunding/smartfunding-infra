export const PROJECT_STATUSES = ['DRAFT', 'ACTIVE', 'SUBMITTED', 'FUNDED', 'CLOSED', 'ARCHIVED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = ['INNOVATION', 'RD', 'INTERNATIONALISATION', 'AUTRE'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/** Secteurs d'activité autorisés (cf. cahier des charges §4.1 — secteur (enum)). */
export const SECTEURS = [
  'AGRICULTURE_AGROALIMENTAIRE',
  'ENERGIE_ENVIRONNEMENT',
  'NUMERIQUE_IA',
  'SANTE_MEDTECH',
  'INDUSTRIE_MANUFACTURIERE',
  'SERVICES_B2B2C',
  'TOURISME_CULTURE',
  'TRANSPORT_LOGISTIQUE',
  'AUTRE',
] as const;
export type ProjectSector = (typeof SECTEURS)[number];

export interface Project {
  id: string;
  reference: string; // format PROJ-{annee}-{sequence sur 3 chiffres}, ex. PROJ-2026-001
  organizationId: string;
  ownerId: string;
  name: string;
  description: string | null;
  budgetCents: number;
  financementRechercheCents: number;
  dureeMois: number | null;
  secteur: string;
  type: ProjectType;
  status: ProjectStatus;
  timelineStart: string | null;
  timelineEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Rôles sur projet (matrice 6 rôles du cahier des charges §4.1) — distincte du
// rôle organisationnel (common.ts Role) : le rôle sur projet est attribué par
// le Chef de Projet via POST /projects/:id/team.
// ============================================================================
export const PROJECT_TEAM_ROLES = [
  'ADMIN',
  'CHEF_PROJET',
  'RESPONSABLE_FINANCIER',
  'VALIDATEUR',
  'CONTRIBUTEUR',
  'CONSULTANT',
] as const;
export type ProjectTeamRole = (typeof PROJECT_TEAM_ROLES)[number];

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  userId: string;
  roleOnProject: ProjectTeamRole;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface ProjectChecklistItem {
  id: string;
  projectId: string;
  label: string;
  isCompleted: boolean;
  order: number;
  category: string | null;
}

export const CALENDAR_EVENT_TYPES = ['DEADLINE_FINANCEUR', 'JALON_INTERNE', 'DEADLINE_DEPOT', 'AUTRE'] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export interface ProjectCalendarEvent {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  type: CalendarEventType;
  isCompleted: boolean;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

/** Agrégats lecture (CQRS — voir docs/adr/0002-cqrs-dashboard.md), cache Redis. */
export interface ProjectDashboard {
  organizationId: string;
  totalProjects: number;
  countsByStatus: Record<ProjectStatus, number>;
  countsBySector: Record<string, number>;
  totalBudgetCents: number;
  totalFinancementRechercheCents: number;
  computedAt: string;
}

// ============================================================================
// Événements RabbitMQ — exchange "smartfunding.events" (topic), queues avec
// dead-letter (dlq.project.*) pour retry/observabilité.
// ============================================================================

/** Événement RabbitMQ — exchange "smartfunding.events", routing key "project.created" */
export interface ProjectCreatedEvent {
  eventId: string; // uuid, clé d'idempotence pour tout consommateur
  eventType: 'ProjectCreated';
  occurredAt: string;
  payload: { projectId: string; organizationId: string; type: ProjectType };
}

/** Événement RabbitMQ — exchange "smartfunding.events", routing key "project.status.changed" */
export interface ProjectStatusChangedEvent {
  eventId: string;
  eventType: 'ProjectStatusChanged';
  occurredAt: string;
  payload: { projectId: string; organizationId: string; previousStatus: ProjectStatus; newStatus: ProjectStatus };
}

/** Événement RabbitMQ — exchange "smartfunding.events", routing key "project.team.member.invited" */
export interface ProjectTeamMemberInvitedEvent {
  eventId: string;
  eventType: 'ProjectTeamMemberInvited';
  occurredAt: string;
  payload: { projectId: string; organizationId: string; userId: string; roleOnProject: ProjectTeamRole };
}
