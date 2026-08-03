
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Firestore } from 'firebase/firestore';

export type AuditAction = 'STATUS_UPDATE' | 'RECORD_CREATED' | 'RECORD_DELETED' | 'PERSONNEL_MODIFIED' | 'BRANDING_UPDATE' | 'VERIFICATION_CHECK' | 'PERFORMANCE_REVIEW';

/**
 * Log an immutable operational action for security auditing.
 * @param db Firestore instance.
 * @param user Acting officer auth record.
 * @param officerName Official full name of the acting officer.
 * @param action The type of protocol being executed.
 * @param targetId The ID of the record or configuration being modified.
 * @param details Narrative explanation of the action.
 */
export function logAuditAction(
  db: Firestore, 
  user: { uid: string; email?: string | null }, 
  officerName: string,
  action: AuditAction, 
  targetId: string, 
  details: string
) {
  if (!db || !user) return;

  const logData = {
    officerId: user.uid,
    officerName: officerName || user.email?.split('@')[0] || 'Official',
    action,
    targetId,
    details,
    timestamp: serverTimestamp(),
  };

  addDocumentNonBlocking(collection(db, 'audit_logs'), logData);
}
