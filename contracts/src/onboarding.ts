export type OnboardingStatus = 'STARTED' | 'QUESTIONNAIRE_DONE' | 'CONFIG_DONE' | 'IMPORT_DONE' | 'COMPLETED' | 'ABANDONED';

export interface OnboardingSession {
  id: string;
  organizationId: string;
  initiatedBy: string; // userId
  status: OnboardingStatus;
  sector?: string;
  organizationSize?: string;
  fundingGoals: string[];
  startedAt: string;
  completedAt: string | null;
}

/** Exchange "onboarding.events" */
export interface OnboardingCompletedEvent {
  eventId: string;
  eventType: 'OnboardingCompleted';
  occurredAt: string;
  payload: { organizationId: string; sessionId: string; durationSeconds: number };
}
