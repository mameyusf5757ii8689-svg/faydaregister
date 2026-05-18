'use client';

import { useMemo } from 'react';
import { useMemoFirebase, useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RegistrationTable } from '@/components/dashboard/registration-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ShieldCheck, Megaphone, Info, Timer, Loader2, Sparkles } from 'lucide-react';
import { Registration, DashboardStats, Announcement, DailyReport } from '@/lib/types';

export default function OfficerDashboard() {
  const { user } = useUser();
  const db = useFirestore();

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'registrations'),
      where('assignedReviewerId', '==', user.uid),
      limit(10000)
    );
  }, [db, user]);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'daily_reports'),
      where('officerId', '==', user.uid)
    );
  }, [db, user]);

  const announcementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'announcements'), limit(5));
  }, [db, user]);

  const { data: registrations, isLoading: isRegLoading } = useCollection<Registration>(registrationsQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
  const { data: announcements, isLoading: isAnnLoading } = useCollection<Announcement>(announcementsQuery);

  const stats: DashboardStats = useMemo(() => {
    const defaultStats = { 
      total: 0, processed: 0, pendingReview: 0, rejected: 0, processing: 0, failed: 0, 
      totalOfficers: 0, activeOfficers: 0, pendingOfficers: 0, onDutyOfficers: 0 
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
  }, [registrations, reports]);

  if (isRegLoading || isReportsLoading) {
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
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Field Terminal v2.4</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline">Officer Hub</h1>
          <p className="text-sm text-muted-foreground max-w-lg">Manage your daily registration counts and assigned applicant worklist.</p>
        </div>
        <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3 px-4 border-r border-border">
            <div className="p-2 bg-primary/10 rounded-xl"><ShieldCheck className="h-5 w-5 text-primary" /></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Duty Status</span>
              <span className="text-sm font-black text-foreground">Active Duty</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-amber-500/10 rounded-xl"><Timer className="h-5 w-5 text-amber-500" /></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Session</span>
              <span className="text-sm font-black text-foreground">Online</span>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Local Performance Metrics
        </h2>
        <StatsCards stats={stats} showOfficerCount={false} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" /> Bureau Activity Ledger
            </h2>
          </div>
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardContent className="p-0">
              {registrations && registrations.length > 0 ? (
                <RegistrationTable registrations={registrations} isDashboardView={true} />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="p-4 bg-muted rounded-full mb-4"><FileText className="h-10 w-10 text-muted-foreground/20" /></div>
                  <h3 className="text-sm font-bold text-foreground mb-1">Queue Empty</h3>
                  <p className="text-xs text-muted-foreground max-w-[200px]">No applicant records found in the bureau database.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 text-primary" /> Bureau Telegrams
          </h2>
          <div className="space-y-3">
            {announcements && announcements.length > 0 ? announcements.map((ann) => (
              <Card key={ann.id} className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${ann.type === 'alert' ? 'bg-red-500 animate-pulse' : ann.type === 'update' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground leading-none">{ann.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ann.content}</p>
                      <p className="text-[9px] font-bold text-muted-foreground/50 uppercase pt-1">{ann.date}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="p-10 text-center border-2 border-dashed rounded-2xl text-muted-foreground/30">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-medium italic">No active bulletins</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}