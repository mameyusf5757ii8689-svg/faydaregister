'use client';

import { useMemo, useState } from 'react';
import { useMemoFirebase, useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query, limit, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RegistrationTable } from '@/components/dashboard/registration-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Activity, Loader2, Database } from 'lucide-react';
import { Registration, DashboardStats, UserProfile, DailyReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isGenerating, setIsSubmitting] = useState(false);

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'registrations'), limit(100));
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
      onDutyOfficers: 0 
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bureau Administration</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">Aggregated registration totals from all bureau daily reports.</p>
        </div>
        <div className="flex items-center gap-3">
          {(stats.total === 0) && (
            <Button variant="outline" size="sm" onClick={handleGenerateSampleData} disabled={isGenerating}>
              <Database className="mr-2 h-4 w-4" /> 
              {isGenerating ? "Generating..." : "Load Sample Data"}
            </Button>
          )}
          <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-border">
              <Users className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Officers</span>
                <span className="text-sm font-bold text-foreground">{stats.totalOfficers}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3">
              <Activity className="h-4 w-4 text-green-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">System</span>
                <span className="text-sm font-bold text-green-600">Optimal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Activity className="h-3 w-3" /> Reported Totals (Bureau-wide)
        </h2>
        <StatsCards stats={stats} showOfficerCount={true} />
      </section>

      <section>
        <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 border-b border-border pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">Bureau Detail Ledger</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground/30" />
          </CardHeader>
          <CardContent className="p-0">
            {registrations && registrations.length > 0 ? (
              <RegistrationTable registrations={registrations.slice(0, 10)} isDashboardView={true} />
            ) : (
              <div className="py-20 text-center text-muted-foreground/30">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="text-foreground font-medium">No individual applicant records found.</p>
                <p className="text-xs">System is awaiting detailed applicant data synchronization.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}