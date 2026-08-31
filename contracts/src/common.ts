/** Type monétaire — TOUJOURS en unité mineure entière (centimes/centimes XAF), jamais de float pour de l'argent.
 *  EUR pour la tarification officielle (cahier des charges §9.1) ; XAF ajouté suite à la décision
 *  de prioriser Maviance/Smobilpay (paiement Mobile Money CEMAC) — voir smartfunding-billing/docs/adr/0001. */
export interface Money {
  amountCents: number; // ex. 1990 = 19,90 € ou 19,90 XAF selon `currency`
  currency: 'EUR' | 'XAF';
}

export interface PaginationQuery {
  page: number;   // défaut 1
  limit: number;  // défaut 20, max 100
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

/** Enveloppe d'erreur standard — TOUS les services doivent répondre les erreurs sous cette forme. */
export interface ApiError {
  statusCode: number;
  errorCode: string;   // ex. "AUTH_INVALID_CREDENTIALS", "PROJECT_NOT_FOUND" — voir ERROR_CODES.md
  message: string;      // message générique, jamais d'info sensible (cf. §7 threat model de chaque service)
  requestId: string;    // = X-Request-Id, pour corrélation avec les logs
  details?: Record<string, string[]>; // erreurs de validation champ par champ
}

export type Role =
  | 'ADMIN'
  | 'CHEF_PROJET'
  | 'RESPONSABLE_FINANCIER'
  | 'VALIDATEUR'
  | 'CONTRIBUTEUR'
  | 'CONSULTANT';

export type PlanTier = 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

// ============================================================================
// Notifications — types partagés (smartfunding-notifications)
// ============================================================================

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';

export type NotificationTemplateId =
  | 'OTP_2FA'
  | 'PROJECT_CREATED'
  | 'PROJECT_STATUS_CHANGED'
  | 'DOCUMENT_VALIDATED'
  | 'ONBOARDING_COMPLETED'
  | 'USER_REGISTERED'
  | 'PAYMENT_SUCCEEDED'
  | 'REPORTING_DEADLINE_APPROACHING'
  | 'SUBMISSION_STATUS_CHANGED'
  | 'BR003_ALERT'
  | 'DOCUMENT_REJECTED'
  | 'FR_ACCEPTED'
  | 'FR_REJECTED'
  | 'FR_COMPLEMENTS_REQUESTED'
  | 'FR_CORRECTIONS_REQUESTED'
  | 'FR_READY_TO_SUBMIT'
  | 'SLA_ESCALATION'
  | 'DEADLINE_REMINDER';

export type NotificationLocale = 'FR' | 'EN';

export interface NotificationRecipient {
  userId?: string;
  organizationId?: string;
  email?: string;
  phone?: string;
  pushToken?: string; // token FCM (canal PUSH)
  name?: string;
  locale?: NotificationLocale;
}

/** Requête d'envoi transactionnel SYNCHRONE — réservé aux cas où une réponse immédiate
 *  est requise (OTP 2FA, cf. smartfunding-auth §3.5.3). Appelé via POST /notifications/send-transactional. */
export interface SendTransactionalRequest {
  to: NotificationRecipient;
  template: NotificationTemplateId;
  data: Record<string, string>;
  channel: NotificationChannel;
}

/** Requête d'envoi asynchrone (événement RabbitMQ ou appel REST générique). */
export interface SendNotificationRequest {
  recipient: NotificationRecipient;
  template: NotificationTemplateId;
  data: Record<string, string>;
  channel: NotificationChannel;
  eventId?: string; // clé d'idempotence (déduplication par eventId)
}

export type EmailProvider = 'RESEND' | 'EMAILIT';

export type DeliveryStatus = 'SENT' | 'FAILED' | 'RETRYING';

export interface SendNotificationResponse {
  id: string;
  channel: NotificationChannel;
  provider?: string; // nom du fournisseur effectif (RESEND/BREVO/TWILIO/FIREBASE/REDIS)
  status: DeliveryStatus;
  requestId: string;
}

/** Notification in-app stockée (lisible via GET /notifications/in-app?userId=...). */
export interface InAppNotification {
  id: string;
  userId: string;
  template: NotificationTemplateId;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

/** Webhook sortant enregistré par une organisation (POST /notifications/webhooks). */
export interface OutgoingWebhook {
  id: string;
  organizationId: string;
  url: string;
  secret: string;
  events: string[];
  failureCount: number;
  active: boolean;
  createdAt: string;
}
