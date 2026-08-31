import { Role } from './common';

export interface User {
  id: string; // uuid
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  is2faEnabled: boolean;
  createdAt: string; // ISO 8601
}

export interface Organization {
  id: string;
  name: string;
  siret?: string;
  planTier: import('./common').PlanTier;
  createdAt: string;
}

export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: Role;
  joinedAt: string | null;
}

/** Payload retourné par POST /auth/verify — CONTRAT utilisé par les 7 microservices + le Gateway */
export interface AuthVerifyResponse {
  valid: boolean;
  userId?: string;
  organizationId?: string;
  role?: Role;
  reason?: 'EXPIRED' | 'BLACKLISTED' | 'INVALID_SIGNATURE' | 'REVOKED';
}

// ============================================================================
// 2FA par email (cf. smartfunding-auth/docs/adr/0001-2fa-email-uniquement.md)
// ============================================================================

export interface Otp2faVerifyRequest {
  challengeToken: string;
  code: string; // 6 chiffres
}

export type Otp2faFailureReason = 'INVALID_CODE' | 'EXPIRED' | 'MAX_ATTEMPTS_EXCEEDED';

export interface Otp2faVerifyResponse {
  success: boolean;
  reason?: Otp2faFailureReason;
}

/** Événement RabbitMQ — exchange "smartfunding.events", routing key "user.registered" */
export interface UserRegisteredEvent {
  eventId: string;
  eventType: 'UserRegistered';
  occurredAt: string;
  payload: { userId: string; organizationId: string | null; email: string; firstName: string; lastName: string };
}
