/**
 * Entité "KPIs" du cahier des charges §4.1 (id, organization_id, success_rate, time_saved, roi).
 *
 * C'EST LA TABLE DE TRAÇABILITÉ entre les objectifs business du cahier des charges §1.2
 * (-60% temps de recherche, +40% taux de succès, 80% de tâches automatisées) et les données
 * réelles produites par la plateforme. Sans cette entité, ces objectifs restent des intentions
 * non mesurables — c'était le trou identifié lors de l'audit de conformité.
 *
 * Alimentée par : smartfunding-workflow (résultat FUNDED/REJECTED de chaque FundingRequest,
 * cf. capitalizeOutcome), smartfunding-onboarding (temps gagné estimé via le funnel), et calculée
 * périodiquement par un job dédié (voir smartfunding-projects, module CQRS/reporting §7).
 */
export interface OrganizationKpiSnapshot {
  id: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;

  // Objectif cahier des charges §1.2 : +40% taux de succès
  successRate: number; // 0 à 1 — dossiers FUNDED / dossiers SUBMITTED sur la période

  // Objectif cahier des charges §1.2 : -60% temps de recherche de financement
  avgTimeToSubmissionHours: number; // durée moyenne entre ProjectCreated et premier FundingRequest.status=SUBMITTED
  timeSavedVsManualEstimateHours: number; // comparaison à une baseline déclarée (processus manuel, cf. §11.1 "Benchmarks : comparaison avec processus manuels")

  // Objectif cahier des charges §1.2 : 80% de tâches administratives automatisées
  automatedTasksRatio: number; // 0 à 1 — proportion de tâches complétées sans intervention manuelle (ex. génération auto de business plan, remplissage auto de formulaire)

  // Objectif cahier des charges §7.1 (business) : ROI
  roiEstimateCents: number | null; // financement obtenu - coût de l'abonnement sur la période, si calculable
}
