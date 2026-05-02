'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileCheck, 
  ArrowRight, 
  Shield,
  Zap,
  Globe,
  Loader2
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { Registration, UserProfile } from '@/lib/types';
import { isToday } from 'date-fns';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user || isUserLoading) return null;
    return query(collection(db, 'registrations'), limit(1000));
  }, [db, user, isUserLoading]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user || isUserLoading) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db, user, isUserLoading]);

  const { data: registrations, isLoading: isRegLoading } = useCollection<Registration>(registrationsQuery);
  const { data: officers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

  const stats = useMemo(() => {
    if (!user || !registrations || !officers) return { officers: '0', todayCases: '0', efficiency: '0%' };
    const totalRegs = registrations.length;
    const processedRegs = registrations.filter(r => r.status === 'Processed').length;
    const todayCases = registrations.filter(r => {
      try { return isToday(new Date(r.submissionDate)); } catch { return false; }
    }).length;
    const efficiency = totalRegs > 0 ? ((processedRegs / totalRegs) * 100).toFixed(0) : "0";
    return {
      officers: officers.length.toString(),
      todayCases: todayCases.toString(),
      efficiency: `${efficiency}%`
    };
  }, [user, registrations, officers]);

  return (
    <div className="flex flex-col min-h-screen -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 bg-background">
      {/* Minimal Hero */}
      <section className="relative w-full py-32 lg:py-48 overflow-hidden border-b">
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-1000">
              <Shield className="h-3 w-3" />
              Secure Bureau Framework
            </div>
            
            <h1 className="text-4xl lg:text-7xl font-black tracking-tighter leading-tight text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
              Field Intelligence. <br/>
              <span className="text-muted-foreground font-normal italic">Precisely Synced.</span>
            </h1>
            
            <p className="text-base lg:text-lg text-muted-foreground max-w-xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              The professional portal for bureau registration management, real-time coordination, and AI-assisted data triage.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-xs font-black uppercase tracking-widest rounded-md" asChild>
                <Link href={user ? "/dashboard" : "/login"}>
                  Launch Terminal <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                  Personnel Authorization Required
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Snapshot Section */}
      <section className="w-full py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <SnapshotCard label="Authorized Personnel" value={stats.officers} isLoading={isUsersLoading} icon={Zap} />
            <SnapshotCard label="Daily Operational Load" value={stats.todayCases} isLoading={isRegLoading} icon={FileCheck} />
            <SnapshotCard label="System Efficiency" value={stats.efficiency} isLoading={isRegLoading} icon={Globe} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-16 border-t mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-6">
            <FileCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-black tracking-widest uppercase text-foreground">RegistraTrack</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest max-w-sm leading-relaxed">
            © 2026 Bureau Operations Group. <br/> Access restricted to authorized official personnel only.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SnapshotCard({ label, value, icon: Icon, isLoading }: any) {
  return (
    <div className="p-8 rounded-lg bg-background border shadow-sm transition-all hover:border-primary/30 group">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
      </div>
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      ) : (
        <p className="text-3xl font-black text-foreground tracking-tighter">{value}</p>
      )}
    </div>
  );
}