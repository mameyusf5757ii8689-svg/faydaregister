
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Firestore } from 'firebase/firestore';

export type AuditAction = 'STATUS_UPDATE' | 'RECORD_CREATED' | 'RECORD_DELETED' | 'PERSONNEL_MODIFIED' | 'BRANDING_UPDATE' | 'VERIFICATION_CHECK';

export function logAuditAction(
  db: Firestore, 
  user: { uid: string; displayName?: string | null }, 
  action: AuditAction, 
  targetId: string, 
  details: string
) {
  if (!db || !user) return;

  const logData = {
    officerId: user.uid,
    officerName: user.displayName || 'Official',
    action,
    targetId,
    details,
    timestamp: serverTimestamp(),
  };

  addDocumentNonBlocking(collection(db, 'audit_logs'), logData);
}
