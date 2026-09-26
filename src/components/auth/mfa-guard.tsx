
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

/**
 * MFA Guard Component
 * Enforces mandatory OTP verification for all authenticated users.
 * Redirects to /login if the session MFA handshake is missing.
 */
export function MfaGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (isUserLoading) return;

    // Public pages exception
    const isPublicPage = pathname === '/login' || pathname === '/';
    
    if (!user) {
      if (!isPublicPage) {
        router.push('/login');
      }
      setIsVerified(false);
      return;
    }

    // Authenticated user check
    const mfaSatisfied = sessionStorage.getItem('fayda_mfa_verified') === 'true';
    
    if (!mfaSatisfied && !isPublicPage) {
      // Redirect back to login to handle the OTP challenge mode
      router.push('/login');
      setIsVerified(false);
    } else {
      setIsVerified(true);
    }
  }, [user, isUserLoading, pathname, router]);

  const isChecking = isUserLoading || (user && isVerified === null);

  if (isChecking && pathname !== '/' && pathname !== '/login') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Validating Security Session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
