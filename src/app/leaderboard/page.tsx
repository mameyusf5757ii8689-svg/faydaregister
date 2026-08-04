
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Trophy, 
  Medal, 
  RotateCw, 
  Users, 
  TrendingUp, 
  Loader2, 
  Phone, 
  Smartphone, 
  MapPin,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  User,
  Activity,
  BadgeCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, limit, doc } from 'firebase/firestore';
import { DailyReport, UserProfile } from '@/lib/types';
import { logAuditAction } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LeaderboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'daily_reports'), limit(2000));
  }, [db, user]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db, user]);

  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

  const leaderboardData = useMemo(() => {
    if (!reports || !allUsers || !selectedDate) return [];

    const dayReports = reports.filter(rep => rep.date === selectedDate);
    const officerStatsMap = new Map<string, { total: number; ethio: number; safaricom: number }>();

    dayReports.forEach(rep => {
      const current = officerStatsMap.get(rep.officerId) || { total: 0, ethio: 0, safaricom: 0 };
      officerStatsMap.set(rep.officerId, {
        total: current.total + (rep.total || 0),
        ethio: current.ethio + (rep.ethioCount || 0),
        safaricom: current.safaricom + (rep.safaricomCount || 0),
      });
    });

    return Array.from(officerStatsMap.entries())
      .map(([officerId, stats]) => {
        const profile = allUsers.find(u => u.id === officerId);
        return {
          officerId,
          name: profile?.fullName || 'Unknown Official',
          cluster: profile?.cluster || 'N/A',
          region: profile?.region || 'N/A',
          registrations: stats.total,
          ethio: stats.ethio,
          safaricom: stats.safaricom,
        };
      })
      .sort((a, b) => b.registrations - a.registrations)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [reports, allUsers, selectedDate]);

  const summary = useMemo(() => {
    const totalRegs = leaderboardData.reduce((acc, curr) => acc + curr.registrations, 0);
    const avg = leaderboardData.length > 0 ? (totalRegs / leaderboardData.length).toFixed(1) : "0";
    return { totalRegs, avg };
  }, [leaderboardData]);

  const handleExportExcel = () => {
    if (leaderboardData.length === 0 || !profile) return;
    setIsExporting(true);
    
    const exportData = leaderboardData.map(l => ({
      'Rank': l.rank,
      'Officer': l.name,
      'Cluster': l.cluster,
      'Region': l.region,
      'Ethio': l.ethio,
      'Safaricom': l.safaricom,
      'Total': l.registrations
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");
    XLSX.writeFile(wb, `Bureau_Leaderboard_${selectedDate}.xlsx`);

    logAuditAction(
      db, user!, profile.fullName, 'PERFORMANCE_REVIEW', 'leaderboard',
      `Exported Excel performance leaderboard for date ${selectedDate}.`
    );

    toast({ title: "Excel Intelligence Exported", description: "Official performance rankings downloaded." });
    setTimeout(() => setIsExporting(false), 800);
  };

  const handleExportPDF = () => {
    if (leaderboardData.length === 0 || !profile) return;
    setIsExporting(true);

    const doc = new jsPDF();
    doc.text(`Official Bureau Performance Leaderboard`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${selectedDate} | Total Units: ${leaderboardData.length} | Aggregate Intake: ${summary.totalRegs}`, 14, 22);

    const rows = leaderboardData.map(l => [
      l.rank, l.name, l.cluster, l.region, l.ethio, l.safaricom, l.registrations
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Rank', 'Official', 'Cluster', 'Region', 'Ethio', 'Safaricom', 'Total']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Bureau_Leaderboard_${selectedDate}.pdf`);

    logAuditAction(
      db, user!, profile.fullName, 'PERFORMANCE_REVIEW', 'leaderboard',
      `Exported PDF performance ledger for date ${selectedDate}.`
    );

    toast({ title: "PDF Ledger Generated", description: "High-fidelity performance document saved." });
    setTimeout(() => setIsExporting(false), 800);
  };

  const handleSync = () => {
    window.location.reload();
  };

  if (isReportsLoading || isUsersLoading || !selectedDate) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />
             </div>
             <div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Official Tiers</h1>
                <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Personnel Ranking Matrix • {format(new Date(selectedDate), 'MMMM dd, yyyy')}</p>
             </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-card p-2.5 rounded-2xl border shadow-sm w-full md:w-auto">
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="h-11 bg-background border-border rounded-xl font-black text-[10px] uppercase tracking-widest w-full sm:w-[160px]" 
          />
          <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
          <Button onClick={handleSync} variant="outline" className="flex-1 sm:flex-none h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest border-border bg-background hover:bg-muted">
             <RotateCw className="mr-2 h-4 w-4" /> Sync
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={handleExportExcel} disabled={isExporting} variant="outline" className="flex-1 sm:flex-none h-11 px-4 rounded-xl border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 font-bold text-[10px] uppercase tracking-widest bg-background">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="flex-1 sm:flex-none h-11 px-4 rounded-xl border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-bold text-[10px] uppercase tracking-widest bg-background">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leaderboardData.slice(0, 3).map((perf) => (
          <Card key={perf.officerId} className={cn(
            "border-none shadow-sm overflow-hidden rounded-[32px] transition-all hover:shadow-xl relative group", 
            perf.rank === 1 ? "bg-amber-500/5 ring-2 ring-amber-500/20" : "bg-card"
          )}>
            <CardContent className="p-6 sm:p-8">
              <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity rotate-12">
                 <Trophy className="h-48 w-48" />
              </div>
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center border-2",
                    perf.rank === 1 ? "bg-amber-500 border-amber-600 text-white" : 
                    perf.rank === 2 ? "bg-slate-300 border-slate-400 text-slate-700" : "bg-orange-300 border-orange-400 text-orange-700"
                  )}>
                    {perf.rank === 1 ? <Trophy className="h-5 w-5 sm:h-6 sm:w-6" /> : <Medal className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </div>
                  <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">#{perf.rank}</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">{perf.registrations.toLocaleString()}</span>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest -mt-1 opacity-50">Intake</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight line-clamp-1">{perf.name}</h3>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-primary" />
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest line-clamp-1">
                       {perf.cluster} • {perf.region}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/40 rounded-2xl border border-border shadow-inner">
                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1.5"><Phone className="h-2.5 w-2.5 text-emerald-500" /> Ethio</p>
                    <p className="text-lg font-black text-foreground">{perf.ethio}</p>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-2xl border border-border shadow-inner">
                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 flex items-center gap-1.5"><Smartphone className="h-2.5 w-2.5 text-orange-500" /> Safaricom</p>
                    <p className="text-lg font-black text-foreground">{perf.safaricom}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SummaryCard label="Bureau Velocity" value={summary.totalRegs.toLocaleString()} icon={Activity} color="text-primary" />
        <SummaryCard label="Average Unit Output" value={summary.avg} icon={ArrowUpRight} color="text-emerald-500" />
      </div>

      <Card className="border border-border bg-card overflow-hidden rounded-[32px] shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-16 w-[100px] pl-6 sm:pl-10">Rank</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-16">Official Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-16 hidden md:table-cell">Sector</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-16 text-center hidden sm:table-cell">Ethio</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-16 text-center hidden sm:table-cell">Safaricom</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-16 text-right pr-6 sm:pr-10">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.length > 0 ? leaderboardData.map((perf) => (
                <TableRow key={perf.officerId} className="hover:bg-muted/20 transition-colors border-border h-20 sm:h-24 group">
                  <TableCell className="pl-6 sm:pl-10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center border transition-all",
                        perf.rank === 1 ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : 
                        perf.rank <= 3 ? "bg-primary/5 border-primary/10 text-primary" : "bg-muted border-border text-muted-foreground"
                      )}>
                        {perf.rank === 1 ? <Trophy className="h-4 w-4 sm:h-5 sm:w-5" /> : 
                         perf.rank <= 3 ? <Medal className="h-4 w-4 sm:h-5 sm:w-5" /> : <User className="h-4 w-4 sm:h-5 sm:w-5 opacity-40" />}
                      </div>
                      <span className="font-black text-foreground text-base sm:text-lg tracking-tighter">#{perf.rank}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base font-black text-foreground tracking-tight uppercase line-clamp-1">{perf.name}</span>
                      <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-tighter flex items-center gap-1">
                         <BadgeCheck className="h-2.5 w-2.5 text-primary opacity-40" /> Verified Official
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-foreground/80 uppercase tracking-widest">{perf.cluster}</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">{perf.region}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                     <span className="text-sm font-black text-emerald-600 tabular-nums">{perf.ethio}</span>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                     <span className="text-sm font-black text-orange-600 tabular-nums">{perf.safaricom}</span>
                  </TableCell>
                  <TableCell className="text-right pr-6 sm:pr-10">
                    <div className="inline-flex items-center justify-center h-10 sm:h-12 px-4 sm:px-6 rounded-2xl bg-primary/5 text-base sm:text-lg font-black text-primary ring-1 ring-primary/10 shadow-sm transition-transform group-hover:scale-105">
                      {perf.registrations.toLocaleString()}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 opacity-20">
                      <Zap className="h-16 w-16 text-muted-foreground" />
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">Terminal Scan Complete: Zero Activity Signals</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="p-6 bg-primary/[0.03] border border-primary/10 rounded-[32px] flex items-center gap-6">
        <ShieldCheck className="h-8 w-8 text-primary shrink-0 opacity-40 hidden sm:block" />
        <p className="text-[10px] text-foreground font-bold uppercase leading-relaxed tracking-widest max-w-5xl text-center sm:text-left">
          Performance Integrity Policy: This leaderboard reflects raw registration intake reported by field units for the specified date. All data is synchronized from daily reports and subject to audit verification. Exported records are signed into the Forensic Audit Ledger under your official administrative signature.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-[32px] group">
      <CardContent className="p-6 sm:p-8 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-muted rounded-xl"><Icon className={cn("h-4 w-4", color)} /></div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
          </div>
          <p className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter">{value}</p>
        </div>
        <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted/30 rounded-full flex items-center justify-center border border-border group-hover:scale-110 transition-transform">
           <TrendingUp className={cn("h-6 w-6 sm:h-8 sm:w-8 opacity-10", color)} />
        </div>
      </CardContent>
    </Card>
  );
}
