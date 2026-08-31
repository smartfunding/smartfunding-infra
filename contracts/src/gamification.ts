/** Gamification (P5) — profil de progression des organisations (PME) et réputation des financeurs.
 *  Source des règles (points, niveaux, badges) : PARAMETERS.md / TASKS funders §Gamification. */

export type GamificationLevel = 'NOVICE' | 'CONFIRME' | 'AGUERRI' | 'EXPERT';

export type GamificationBadgeId =
  | 'PREMIERE_SOUMISSION'
  | 'DOSSIER_VALIDE'
  | 'PROJET_FINANCE'
  | 'REACTIVITE_24H'
  | 'DOSSIER_EXCELLENT'
  | 'TAUX_SUCCES_50';

export interface GamificationBadge {
  id: GamificationBadgeId;
  label: string;
  description: string;
  icon: string;
  awardedAt: string;
}

export interface GamificationProfile {
  organizationId: string;
  points: number;
  level: GamificationLevel;
  /** Seuil minimal du niveau courant — contexte affiché côté UI. */
  levelThreshold: number;
  badges: GamificationBadge[];
  stats: {
    submissions: number;
    funded: number;
    rejected: number;
    cancelled: number;
    /** Délai moyen création → validation interne, en heures ; null tant qu'aucune soumission validée. */
    avgApprovalHours: number | null;
  };
  updatedAt: string;
}

/** Réputation d'un financeur — agrégation publique (feedback modéré + historique_succès BR-001). */
export interface FunderReputation {
  funderId: string;
  /** Taux de succès [0-1] calculé sur les outcomes réels (FundingRequests) ; null si aucun outcome. */
  successRate: number | null;
  /** Nombre de feedbacks acceptés (modération) ayant une note. */
  ratingsCount: number;
  /** Note moyenne [1-5] des feedbacks acceptés ; null si aucun. */
  ratingAvg: number | null;
  updatedAt: string;
}