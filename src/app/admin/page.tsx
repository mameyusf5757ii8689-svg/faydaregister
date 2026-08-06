
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMemoFirebase, useCollection, useUser, useFirestore, useDoc } from '@/firebase';
import { collection, query, limit, doc, orderBy } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  Timer,
  ShieldAlert,
  History,
  Zap,
  Fingerprint,
  ArrowRight,
  User,
  Clock,
  FileSpreadsheet,
  FileText as FileTextIcon
} from 'lucide-react';
import { Registration, DashboardStats, UserProfile, DailyReport, AuditLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/audit';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
    return query(collection(db, 'registrations'), limit(1000));
  }, [db, user]);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'daily_reports'), limit(1000));
  }, [db, user]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db, user]);

  const auditQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(6));
  }, [db, user]);

  const { data: registrations, isLoading: isRegLoading } = useCollection<Registration>(registrationsQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
  const { data: officers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);
  const { data: recentAudit, isLoading: isAuditLoading } = useCollection<AuditLog>(auditQuery);

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

  const criticalPriorities = useMemo(() => {
    if (!registrations) return [];
    return registrations.filter(r => 
      r.status === 'Failed' || 
      (r.status === 'Rejected' && r.rejectionReason === 'Biometric Match')
    ).sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()).slice(0, 5);
  }, [registrations]);

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

  const handleExportExcel = () => {
    if (!registrations || registrations.length === 0 || !user || !profile) return;
    setIsExporting(true);

    const exportData = registrations.map(r => ({
      'ID': r.id,
      'Applicant': r.applicantName,
      'Date': format(new Date(r.submissionDate), 'yyyy-MM-dd'),
      'Status': r.status,
      'Location': r.location
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GlobalRegistry");
    XLSX.writeFile(wb, `Bureau_Global_Registry_${format(new Date(), 'yyyyMMdd')}.xlsx`);

    logAuditAction(
      db, 
      user, 
      profile.fullName, 
      'PERFORMANCE_REVIEW', 
      'admin_dashboard', 
      `Admin Overview: Generated global XLSX snapshot for ${registrations.length} records.`
    );

    toast({ title: "Excel Intelligence Exported", description: "Global registry snapshot downloaded." });
    setTimeout(() => setIsExporting(false), 800);
  };

  const handleExportPDF = () => {
    if (!registrations || registrations.length === 0 || !user || !profile) return;
    setIsExporting(true);

    const doc = new jsPDF();
    doc.text(`Bureau Global Registry Snapshot: ${profile.fullName}`, 14, 15);
    const rows = registrations.map(r => [r.id.substring(0, 15)+'...', r.applicantName, format(new Date(r.submissionDate), 'MMM dd'), r.status]);
    autoTable(doc, {
      startY: 25,
      head: [['RID', 'Applicant', 'Date', 'Status']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });
    doc.save(`Bureau_Global_Snapshot_${format(new Date(), 'yyyyMMdd')}.pdf`);

    logAuditAction(
      db, 
      user, 
      profile.fullName, 
      'PERFORMANCE_REVIEW', 
      'admin_dashboard', 
      `Admin Overview: Generated global PDF snapshot for ${registrations.length} records.`
    );

    toast({ title: "PDF Document Generated", description: "Official bureau documentation saved." });
    setTimeout(() => setIsExporting(false), 800);
  };

  if (isRegLoading || isReportsLoading || isUsersLoading || isAuditLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Initializing Command Home</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header Command */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              profile?.isDutyActive ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Bureau Administration Hub</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Admin Overview</h1>
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

      {/* Stats Matrix */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Activity className="h-3 w-3 text-primary" /> Reported Totals (Bureau-wide)
        </h2>
        <StatsCards stats={stats} showOfficerCount={true} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Worklist */}
        <section className="xl:col-span-8 space-y-6">
          <Card className="border border-border shadow-sm rounded-[32px] overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                 <CardTitle className="text-lg font-black text-foreground uppercase tracking-tight">Bureau Detail Ledger</CardTitle>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Consolidated applicant records across all sectors</p>
              </div>
              <div className="flex items-center gap-3">
                 <Button onClick={handleExportExcel} disabled={isExporting} variant="outline" size="sm" className="h-9 px-4 rounded-xl border-emerald-500/20 text-emerald-600 font-black text-[9px] uppercase tracking-widest bg-background">
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />} XLS
                 </Button>
                 <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" size="sm" className="h-9 px-4 rounded-xl border-rose-500/20 text-rose-600 font-black text-[9px] uppercase tracking-widest bg-background">
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileTextIcon className="mr-1.5 h-3.5 w-3.5" />} PDF
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {registrations && registrations.length > 0 ? (
                <RegistrationTable registrations={registrations} isDashboardView={true} />
              ) : (
                <div className="py-32 text-center text-muted-foreground/30">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-10" />
                  <p className="text-foreground font-black uppercase tracking-widest text-sm">No applicant records detected</p>
                  <p className="text-xs mt-1 italic">System is awaiting detailed applicant data synchronization.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Intelligence Sidebars */}
        <aside className="xl:col-span-4 space-y-8">
          {/* Critical Priority Monitor */}
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Critical Priority Monitor
            </h2>
            <div className="space-y-3">
              {criticalPriorities.length > 0 ? criticalPriorities.map((item) => (
                <Card key={item.id} className="border border-rose-500/20 bg-rose-500/[0.02] shadow-sm rounded-2xl overflow-hidden group hover:bg-rose-500/[0.04] transition-all">
                  <CardContent className="p-4 flex gap-4">
                    <div className="p-2.5 bg-rose-500/10 rounded-xl h-fit text-rose-600">
                      <Zap className="h-4 w-4 animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-1">
                       <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-foreground uppercase leading-none">{item.applicantName}</p>
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-500 text-white rounded uppercase tracking-tighter">Urgent</span>
                       </div>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          {item.status}: {item.rejectionReason || "Protocol Error"}
                       </p>
                       <p className="text-[9px] font-mono font-bold text-rose-500/50 pt-1">RID: {item.id.substring(0, 15)}...</p>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="p-12 text-center border-2 border-dashed rounded-[32px] border-emerald-500/10 bg-emerald-500/[0.02]">
                  <ShieldCheck className="h-10 w-10 text-emerald-500/20 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Operational Calm</p>
                  <p className="text-[9px] text-muted-foreground/60 uppercase font-bold mt-1">Zero high-risk discrepancies detected</p>
                </div>
              )}
            </div>
          </section>

          {/* Recent Forensic Snapshot */}
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Forensic Snapshot
            </h2>
            <Card className="border border-border shadow-sm bg-card rounded-[32px] overflow-hidden">
               <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {recentAudit?.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-start gap-3">
                           <div className="p-2 bg-muted rounded-lg text-muted-foreground shrink-0">
                              <Fingerprint className="h-3.5 w-3.5 opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
                           </div>
                           <div className="flex-1 space-y-0.5 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-black text-foreground truncate uppercase tracking-tight">{log.officerName}</p>
                                <span className="text-[8px] font-mono font-bold text-muted-foreground/30 whitespace-nowrap">
                                  {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm:ss') : 'Just now'}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground font-medium leading-relaxed italic truncate">
                                {log.details}
                              </p>
                              <div className="pt-1 flex items-center gap-2">
                                 <span className="text-[7px] font-black uppercase px-1 py-0.5 bg-primary/5 text-primary border border-primary/10 rounded tracking-tighter">
                                    {log.action.replace(/_/g, ' ')}
                                 </span>
                              </div>
                           </div>
                        </div>
                      </div>
                    ))}
                    {!recentAudit?.length && (
                      <div className="p-12 text-center opacity-20">
                         <Clock className="h-8 w-8 mx-auto mb-2" />
                         <p className="text-[10px] font-black uppercase">Ledger Empty</p>
                      </div>
                    )}
                  </div>
               </CardContent>
               {recentAudit && recentAudit.length > 0 && (
                 <div className="p-3 border-t border-border bg-muted/10">
                   <Button variant="ghost" size="sm" className="w-full h-8 rounded-xl font-black text-[9px] uppercase tracking-widest text-muted-foreground hover:text-primary" asChild>
                     <Link href="/admin/audit-ledger">
                        View Full Forensic Vault <ArrowRight className="ml-2 h-3 w-3" />
                     </Link>
                   </Button>
                 </div>
               )}
            </Card>
          </section>
        </aside>
      </div>
      
      <div className="p-6 bg-primary/[0.03] border border-primary/10 rounded-[32px] flex items-center gap-4">
        <ShieldCheck className="h-6 w-6 text-primary shrink-0 opacity-40" />
        <p className="text-[10px] text-foreground font-bold uppercase leading-relaxed tracking-widest max-w-5xl">
          Administrative Command Protocol: You are viewing the global bureau ledger. Every action triggered from this terminal—including mass triage and personnel revocation—is signed into the Forensic Ledger under your official administrative signature. Precision and accountability are mandatory.
        </p>
      </div>
    </div>
  );
}
