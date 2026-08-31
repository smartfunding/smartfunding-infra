export type FunderType = 'SUBVENTION' | 'PRET' | 'CROWDFUNDING' | 'BUSINESS_ANGEL';

export interface Funder {
  id: string;
  name: string;
  type: FunderType;
  organisme: string;
  description: string;
  montantMinCents: number;
  montantMaxCents: number;
  secteursEligibles: string[];
  isActive: boolean;
}

/** Décomposition OBLIGATOIRE du score — ne jamais exposer un nombre seul (règle BR-001) */
export interface FunderMatchScore {
  funderId: string;
  projectId: string;
  totalScore: number; // 0 à 1
  breakdown: {
    secteurMatch: number;      // poids 0.4
    montantAdequation: number; // poids 0.3
    temporalite: number;       // poids 0.2 — 0 si deadline dépassée
    historiqueSucces: number;  // poids 0.1
    eligibilite: number;       // ratio pondéré des critères d'éligibilité (1 si aucun critère)
  };
  explanation: string; // phrase générée expliquant le score à l'utilisateur
}

/** Entité "FundingRequests" du cahier des charges §4.1 — l'intention de candidater
 *  (projet + financeur + montant demandé), en amont du processus de soumission
 *  orchestré par smartfunding-workflow (SubmissionState). Un FundingRequest peut
 *  exister en statut DRAFT avant même qu'une Submission ne soit déclenchée.
 *  Statuts : référentiel cible (voir dossier.ts, décisions D1/D2). */
export interface FundingRequest {
  id: string;
  projectId: string;
  funderId: string;
  requestedAmountCents: number;
  status: import('./dossier').FundingRequestStatus;
  createdAt: string;
}
