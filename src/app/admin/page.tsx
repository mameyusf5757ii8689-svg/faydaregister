'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMemoFirebase, useCollection, useUser, useFirestore, useDoc } from '@/firebase';
import { collection, query, limit, doc } from 'firebase/firestore';
import { updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RegistrationTable } from '@/components/dashboard/registration-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileText, 
  Activity, 
  Loader2, 
  Database, 
  ShieldCheck, 
  Power, 
  RefreshCcw, 
  Timer 
} from 'lucide-react';
import { Registration, DashboardStats, UserProfile, DailyReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/audit';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isGenerating, setIsSubmitting] = useState(false);
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLastSynced(new Date());
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'registrations'), limit(10000));
  }, [db, user]);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'daily_reports'), limit(1000));
  }, [db, user]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), limit(200));
  }, [db, user]);

  const { data: registrations, isLoading: isRegLoading } = useCollection<Registration>(registrationsQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
  const { data: officers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

  useEffect(() => {
    if (registrations || reports || officers) {
      setLastSynced(new Date());
    }
  }, [registrations, reports, officers]);

  const stats: DashboardStats = useMemo(() => {
    const defaultStats = { 
      total: 0, 
      processed: 0, 
      pendingReview: 0, 
      rejected: 0, 
      processing: 0, 
      failed: 0, 
      totalOfficers: officers?.length || 0, 
      activeOfficers: officers?.length || 0, 
      pendingOfficers: 0, 
      onDutyOfficers: officers?.filter(o => o.isDutyActive).length || 0 
    };
    
    const totalFromReports = reports?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

    return {
      ...defaultStats,
      total: totalFromReports,
      processed: registrations?.filter(r => r.status === 'Processed').length || 0,
      pendingReview: registrations?.filter(r => r.status === 'Pending Review').length || 0,
      rejected: registrations?.filter(r => r.status === 'Rejected').length || 0,
      processing: registrations?.filter(r => r.status === 'Processing').length || 0,
      failed: registrations?.filter(r => r.status === 'Failed').length || 0,
    };
  }, [registrations, reports, officers]);

  const handleToggleDuty = async () => {
    if (!db || !user || !profile || isTogglingDuty) return;
    
    setIsTogglingDuty(true);
    const newDutyStatus = !profile.isDutyActive;
    
    try {
      await updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        isDutyActive: newDutyStatus,
        updatedAt: new Date().toISOString()
      });

      logAuditAction(
        db,
        user,
        profile.fullName,
        'PERSONNEL_MODIFIED',
        user.uid,
        `Admin Duty Status Change: Set to ${newDutyStatus ? 'ACTIVE' : 'OFF-DUTY'}.`
      );

      toast({
        title: newDutyStatus ? "Active Duty Initialized" : "Off-Duty Signal Sent",
        description: `Bureau status updated in the coordination matrix.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Protocol Failure",
        description: "Could not synchronize duty status with backend.",
      });
    } finally {
      setIsTogglingDuty(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleGenerateSampleData = () => {
    if (!db || !user) return;
    setIsSubmitting(true);

    const reportSamples = [
      { id: 'REP-1', ethioCount: 15, safaricomCount: 25, total: 40, date: new Date().toISOString().split('T')[0], officerId: user.uid },
      { id: 'REP-2', ethioCount: 10, safaricomCount: 20, total: 30, date: new Date().toISOString().split('T')[0], officerId: user.uid }
    ];

    reportSamples.forEach(sample => {
      setDocumentNonBlocking(doc(db, 'daily_reports', sample.id), sample, { merge: true });
    });

    const regSamples = [
      { id: 'REG-1001', applicantName: 'Adib Ferhad', status: 'Pending Review', location: 'Harar', phone: '0911223344', email: 'adib@example.com', content: 'Industrial expansion application.' },
      { id: 'REG-1002', applicantName: 'Sara Mohammed', status: 'Processed', location: 'Addis Ababa', phone: '0922334455', email: 'sara@example.com', content: 'New business license.' }
    ];

    regSamples.forEach(sample => {
      const data = {
        ...sample,
        submissionDate: new Date().toISOString(),
        assignedReviewerId: user.uid,
        requiredFieldsFilled: true,
        attachmentsIncluded: true,
      };
      setDocumentNonBlocking(doc(db, 'registrations', sample.id), data, { merge: true });
    });

    toast({ title: "Sample Data Created", description: "Reports and records have been added." });
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  if (isRegLoading || isReportsLoading || isUsersLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              profile?.isDutyActive ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Bureau Administration Hub</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline">Admin Overview</h1>
          <p className="text-sm text-muted-foreground max-w-lg">Unified Command Center for bureau-wide operations and personnel oversight.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-card p-3 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3 px-4 border-r border-border">
            <div className={cn(
              "p-2.5 rounded-xl transition-all",
              profile?.isDutyActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
            )}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Admin Status</span>
              <button 
                onClick={handleToggleDuty}
                disabled={isTogglingDuty}
                className={cn(
                  "text-sm font-black uppercase tracking-tighter flex items-center gap-1.5 hover:opacity-80 transition-opacity",
                  profile?.isDutyActive ? "text-emerald-600" : "text-muted-foreground"
                )}
              >
                {isTogglingDuty ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
                {profile?.isDutyActive ? 'Active Duty' : 'Signal Offline'}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 border-r border-border group cursor-pointer" onClick={handleRefresh}>
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:rotate-180 transition-transform duration-500">
              <RefreshCcw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Last Sync</span>
              <span className="text-sm font-black text-foreground uppercase tracking-tighter">
                {lastSynced ? format(lastSynced, 'HH:mm:ss') : '--:--:--'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="p-2.5 bg-muted rounded-xl text-muted-foreground"><Timer className="h-5 w-5" /></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">System</span>
              <span className="text-sm font-black text-green-600 uppercase tracking-tighter">Optimal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        {(stats.total === 0) && (
          <Button variant="outline" size="sm" onClick={handleGenerateSampleData} disabled={isGenerating} className="rounded-xl border-border">
            <Database className="mr-2 h-4 w-4" /> 
            {isGenerating ? "Generating..." : "Load Sample Data"}
          </Button>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Activity className="h-3 w-3 text-primary" /> Reported Totals (Bureau-wide)
        </h2>
        <StatsCards stats={stats} showOfficerCount={true} />
      </section>

      <section className="space-y-4">
        <Card className="border border-border shadow-sm rounded-[32px] overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 border-b border-border py-6 flex flex-row items-center justify-between">
            <div className="space-y-1">
               <CardTitle className="text-lg font-black text-foreground uppercase tracking-tight">Bureau Detail Ledger</CardTitle>
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Consolidated applicant records across all sectors</p>
            </div>
            <FileText className="h-5 w-5 text-muted-foreground/30" />
          </CardHeader>
          <CardContent className="p-0">
            {registrations && registrations.length > 0 ? (
              <RegistrationTable registrations={registrations} isDashboardView={true} />
            ) : (
              <div className="py-32 text-center text-muted-foreground/30">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-10" />
                <p className="text-foreground font-black uppercase tracking-widest text-sm">No applicant records detected</p>
                <p className="text-xs mt-1">System is awaiting detailed applicant data synchronization.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
