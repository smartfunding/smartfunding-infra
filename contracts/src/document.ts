export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface DocumentMetadata {
  id: string;
  projectId: string;
  organizationId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  currentVersion: number;
  metadata: { title?: string; pageCount?: number; detectedType?: string; ocrConfidence?: number; extractedText?: string };
  createdAt: string;
}

/** Exchange "document.events", routing key "document.validated" */
export interface DocumentValidatedEvent {
  eventId: string;
  eventType: 'DocumentValidated';
  occurredAt: string;
  payload: { documentId: string; projectId: string; validatedBy: string };
}

export type ValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ANNOTATED' | 'REEXAMINED';

/** Événement RabbitMQ — exchange "smartfunding.events", routing key "document.rejected". */
export interface DocumentRejectedEvent {
  eventId: string;
  eventType: 'DocumentRejected';
  occurredAt: string;
  payload: { documentId: string; projectId: string; rejectedBy: string; reason: string };
}

/** Entité "Validations" du cahier des charges §4.1 — distincte de DocumentValidatedEvent
 *  (l'événement notifie qu'une validation a eu lieu ; cette entité EST la validation elle-même,
 *  avec son historique complet, y compris les rejets et annotations). */
export interface DocumentValidation {
  id: string;
  documentId: string;
  validatorId: string;
  status: ValidationStatus;
  comments: string | null;
  createdAt: string;
}
