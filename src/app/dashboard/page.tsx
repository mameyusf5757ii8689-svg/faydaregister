
'use client';

import { useMemo, useState } from 'react';
import { useMemoFirebase, useCollection, useUser, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RegistrationTable } from '@/components/dashboard/registration-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  ShieldCheck, 
  Megaphone, 
  Info, 
  Timer, 
  Loader2, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  CalendarPlus, 
  Search,
  Zap,
  Power
} from 'lucide-react';
import { Registration, DashboardStats, Announcement, DailyReport, UserProfile } from '@/lib/types';
import { RegistrationFormModal } from '@/components/registrations/registration-form-modal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/audit';

export default function OfficerDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

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
    return query(collection(db, 'announcements'), limit(10));
  }, [db, user]);

  const { data: rawRegistrations, isLoading: isRegLoading } = useCollection<Registration>(registrationsQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
  const { data: announcements, isLoading: isAnnLoading } = useCollection<Announcement>(announcementsQuery);

  const sortedAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return [...announcements].sort((a, b) => {
      const getTs = (item: Announcement) => {
        if (item.timestamp?.toDate) return item.timestamp.toDate().getTime();
        return new Date(item.date).getTime();
      };
      return getTs(b) - getTs(a);
    });
  }, [announcements]);

  const filteredRegistrations = useMemo(() => {
    if (!rawRegistrations) return [];
    if (!searchTerm) return rawRegistrations;
    return rawRegistrations.filter(reg => 
      reg.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.id.includes(searchTerm) ||
      reg.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawRegistrations, searchTerm]);

  const stats: DashboardStats = useMemo(() => {
    const defaultStats = { 
      total: 0, processed: 0, pendingReview: 0, rejected: 0, processing: 0, failed: 0, 
      totalOfficers: 0, activeOfficers: 0, pendingOfficers: 0, onDutyOfficers: 0 
    };
    
    const totalFromReports = reports?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

    return {
      ...defaultStats,
      total: totalFromReports,
      processed: rawRegistrations?.filter(r => r.status === 'Processed').length || 0,
      pendingReview: rawRegistrations?.filter(r => r.status === 'Pending Review').length || 0,
      rejected: rawRegistrations?.filter(r => r.status === 'Rejected').length || 0,
      processing: rawRegistrations?.filter(r => r.status === 'Processing').length || 0,
      failed: rawRegistrations?.filter(r => r.status === 'Failed').length || 0,
    };
  }, [rawRegistrations, reports]);

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
        `Officer Duty Status Change: Set to ${newDutyStatus ? 'ACTIVE' : 'OFF-DUTY'}.`
      );

      toast({
        title: newDutyStatus ? "Active Duty Initialized" : "Off-Duty Signal Sent",
        description: `Personnel status updated in the bureau coordination matrix.`,
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

  if (isRegLoading || isReportsLoading || isAnnLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Dynamic Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              profile?.isDutyActive ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Field Terminal v2.4</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline">Officer Hub</h1>
          <p className="text-sm text-muted-foreground max-w-lg">Unified Command Center for field operations and mission triage.</p>
        </div>

        <div className="flex items-center gap-4 bg-card p-3 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3 px-4 border-r border-border">
            <div className={cn(
              "p-2.5 rounded-xl transition-all",
              profile?.isDutyActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
            )}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Command Status</span>
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
          <div className="flex items-center gap-3 px-2">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Timer className="h-5 w-5" /></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Network</span>
              <span className="text-sm font-black text-foreground uppercase tracking-tighter">Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RegistrationFormModal 
          mode="add" 
          trigger={
            <Button className="h-20 bg-primary hover:bg-primary/90 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-xl shadow-primary/10 transition-transform active:scale-95">
              <Plus className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">New Registration</span>
            </Button>
          }
        />
        <Button variant="outline" className="h-20 border-border bg-card hover:bg-muted text-foreground rounded-2xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95" asChild>
          <Link href="/daily-registrations">
            <CalendarPlus className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Log Daily Totals</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-20 border-border bg-card hover:bg-muted text-foreground rounded-2xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95" asChild>
          <Link href="/communication">
            <MessageSquare className="h-5 w-5 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Team Comms</span>
          </Link>
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Performance Metrics
        </h2>
        <StatsCards stats={stats} showOfficerCount={false} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Worklist Triage */}
        <section className="xl:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" /> Activity Ledger
            </h2>
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Quick Filter worklist..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 bg-card border-border text-[11px] font-bold rounded-xl"
              />
            </div>
          </div>
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardContent className="p-0">
              {filteredRegistrations && filteredRegistrations.length > 0 ? (
                <RegistrationTable registrations={filteredRegistrations} isDashboardView={true} />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-muted/5">
                  <div className="p-6 bg-muted rounded-full mb-4"><Search className="h-10 w-10 text-muted-foreground/10" /></div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-tight mb-1">No matches in queue</h3>
                  <p className="text-xs text-muted-foreground font-medium italic">Adjust your search parameters or check full registry.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Priorities Intelligence */}
        <section className="xl:col-span-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 text-primary" /> Intelligence Feed
          </h2>
          <div className="space-y-3">
            {sortedAnnouncements.length > 0 ? sortedAnnouncements.map((ann) => {
              const isNew = ann.timestamp?.toDate && profile?.lastAnnouncementReadAt && 
                           ann.timestamp.toDate().getTime() > new Date(profile.lastAnnouncementReadAt).getTime();
              
              return (
                <Card key={ann.id} className={cn(
                  "border-none shadow-sm transition-all hover:shadow-md group relative overflow-hidden",
                  ann.type === 'alert' ? "bg-red-500/5 ring-1 ring-red-500/10" : "bg-card"
                )}>
                  {ann.type === 'alert' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />}
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className={cn(
                        "mt-1 h-2 w-2 rounded-full shrink-0",
                        ann.type === 'alert' ? "bg-red-500 animate-pulse" : 
                        ann.type === 'update' ? "bg-blue-500" : "bg-green-500"
                      )} />
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-black text-foreground leading-tight tracking-tight uppercase">{ann.title}</h4>
                          {isNew && <span className="text-[8px] font-black text-primary uppercase animate-bounce">New</span>}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">{ann.content}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-border/10">
                           <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">{ann.date}</p>
                           {ann.type === 'alert' && (
                             <div className="flex items-center gap-1 text-[8px] font-black text-red-600 uppercase tracking-tighter bg-red-500/10 px-1.5 py-0.5 rounded">
                               <Zap className="h-2 w-2" /> Critical Priority
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }) : (
              <div className="p-16 text-center border-2 border-dashed rounded-3xl text-muted-foreground/10 flex flex-col items-center gap-4">
                <Info className="h-10 w-10 opacity-20" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Zero Active Bulletins</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
