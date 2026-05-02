
'use client';

import { useMemoFirebase, useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query, limit, where } from 'firebase/firestore';
import { RegistrationsList } from '@/components/registrations/registrations-list';
import { Loader2 } from 'lucide-react';
import { RegistrationFormModal } from '@/components/registrations/registration-form-modal';
import { Registration } from '@/lib/types';

export default function RegistrationsManagementPage() {
  const { user } = useUser();
  const db = useFirestore();

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Filter registrations so officers only see records they are responsible for
    return query(
      collection(db, 'registrations'), 
      where('assignedReviewerId', '==', user.uid),
      limit(500)
    );
  }, [db, user]);

  const { data: registrations, isLoading } = useCollection<Registration>(registrationsQuery);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Operations</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Registration Registry</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Manage and review your personally submitted registration records in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RegistrationFormModal mode="add" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
        </div>
      ) : (
        <RegistrationsList initialRegistrations={registrations || []} />
      )}
    </div>
  );
}
