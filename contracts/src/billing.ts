import { PlanTier, Money } from './common';

export const PLAN_LIMITS: Record<PlanTier, { maxProjects: number; maxFunders: number; aiAccess: 'none' | 'basic' | 'advanced' }> = {
  STARTER:    { maxProjects: 1,  maxFunders: 50,  aiAccess: 'none' },
  PRO:        { maxProjects: 5,  maxFunders: 500, aiAccess: 'basic' },
  BUSINESS:   { maxProjects: 20, maxFunders: -1,  aiAccess: 'advanced' }, // -1 = illimité
  ENTERPRISE: { maxProjects: -1, maxFunders: -1,  aiAccess: 'advanced' },
};

export const PLAN_PRICING: Record<PlanTier, Money | null> = {
  STARTER:    { amountCents: 9900,  currency: 'EUR' },
  PRO:        { amountCents: 29900, currency: 'EUR' },
  BUSINESS:   { amountCents: 69900, currency: 'EUR' },
  ENTERPRISE: null, // sur devis
};
// NOTE : la tarification officielle du cahier des charges (§9.1) est en EUR. La conversion EUR->XAF
// pour la collecte Maviance se fait au moment du paiement (taux du jour, cf. TASKS.md §3bis.2),
// PLAN_PRICING reste la source de vérité en EUR — ne jamais dupliquer un tarif fixe en XAF en dur.

export interface QuotaStatus {
  organizationId: string;
  planTier: PlanTier;
  currentProjects: number;
  currentFunderAccess: number;
  isOverQuota: boolean;
}

// ============================================================================
// Maviance / Smobilpay (S3P API) — processeur de paiement PRINCIPAL
// (Mobile Money CEMAC : MTN Mobile Money, Orange Money), cf. décision ADR
// smartfunding-billing/docs/adr/0001-maviance-processeur-principal.md
// Modèle réel de l'API S3P : Quote -> Collect -> Verify (par PTN), cf. apidocs.smobilpay.com
// ============================================================================

export type PaymentProvider = 'MAVIANCE' | 'STRIPE' | 'PAYPAL';

/** Étape 1 du flux S3P : demander un devis pour un item de paiement (service_id Maviance).
 *  Un devis expire après quelques minutes (cf. PARAMETERS.md) — toujours re-demander un
 *  devis juste avant la collecte, jamais réutiliser un vieux quoteId. */
export interface MavianceQuoteRequest {
  payItemId: string;   // identifiant Maviance du service/produit (ex. abonnement PRO)
  amount: number;       // dans la devise locale du service (XAF)
}

export interface MavianceQuote {
  quoteId: string;
  amount: number;
  expiresAt: string; // ISO 8601 — quelques minutes après émission
}

/** Étape 2 : confirmer la collecte à partir d'un devis valide. */
export interface MavianceCollectionRequest {
  quoteId: string;
  customerPhoneNumber: string; // format local CEMAC, ex. 6XXXXXXXX (Cameroun)
  customerEmail?: string;
  serviceNumber: string; // référence de l'abonnement SmartFunding (organizationId ou subscriptionId)
}

/** PTN = Payment Transaction Number — identifiant unique à conserver pour toute réconciliation
 *  et pour l'étape 3 (vérification de statut), cf. TASKS.md §3bis.4. */
export interface MavianceCollectionResponse {
  ptn: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

/** Étape 3 : vérifier le statut réel d'un paiement par son PTN (l'API S3P ne garantit pas
 *  un webhook temps réel pour tous les moyens de paiement — un polling de vérification
 *  est nécessaire en complément, cf. TASKS.md §3bis.5). */
export interface MavianceVerifyResult {
  ptn: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  verifiedAt: string;
}

/** Événement RabbitMQ — exchange "smartfunding.events", routing key "payment.succeeded" */
export interface PaymentSucceededEvent {
  eventId: string;
  eventType: 'PaymentSucceeded';
  occurredAt: string;
  payload: {
    paymentId: string;
    organizationId: string;
    amountCents: number;
    currency: 'EUR' | 'XAF';
  };
}
