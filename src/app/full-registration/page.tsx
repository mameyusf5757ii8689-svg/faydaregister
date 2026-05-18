
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  ShieldCheck, 
  Loader2, 
  TrendingUp, 
  Phone, 
  Smartphone, 
  Calendar, 
  AlertCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { DailyReport, MonthlySummary } from '@/lib/types';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const START_DATE = new Date(2025, 6, 1); // July 1, 2025

export default function FullRegistrationPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // 1. Fetch ALL Monthly Summaries (Historical)
  const summariesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'monthly_summaries'), where('officerId', '==', user.uid));
  }, [db, user]);

  // 2. Fetch ALL Daily Reports (Operational)
  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'daily_reports'), where('officerId', '==', user.uid));
  }, [db, user]);

  const { data: summaries, isLoading: isSummariesLoading } = useCollection<MonthlySummary>(summariesQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);

  // Auto-Archival Logic: Check for completed months that aren't summarized
  useEffect(() => {
    if (!db || !user || !summaries || !reports) return;

    const autoArchive = async () => {
      const now = new Date();
      let checkDate = new Date(START_DATE);
      
      while (checkDate < startOfMonth(now)) {
        const monthLabel = MONTHS[checkDate.getMonth()];
        const yearLabel = checkDate.getFullYear().toString();
        const summaryId = `${user.uid}_${monthLabel}_${yearLabel}`;

        const alreadyExists = summaries.some(s => s.month === monthLabel && s.year === yearLabel);
        
        if (!alreadyExists) {
          const monthReports = reports.filter(r => {
            const rDate = new Date(r.date);
            return rDate.getMonth() === checkDate.getMonth() && rDate.getFullYear() === checkDate.getFullYear();
          });

          if (monthReports.length > 0) {
            const ethio = monthReports.reduce((acc, curr) => acc + (curr.ethioCount || 0), 0);
            const safaricom = monthReports.reduce((acc, curr) => acc + (curr.safaricomCount || 0), 0);
            const total = ethio + safaricom;

            await setDoc(doc(db, 'monthly_summaries', summaryId), {
              id: summaryId,
              officerId: user.uid,
              month: monthLabel,
              year: yearLabel,
              ethio,
              safaricom,
              total,
              processed: 0,
              timestamp: serverTimestamp(),
            }, { merge: true });
          }
        }
        checkDate = new Date(checkDate.setMonth(checkDate.getMonth() + 1));
      }
    };

    autoArchive();
  }, [db, user, summaries, reports]);

  const aggregates = useMemo(() => {
    if (!summaries && !reports) return { ethio: 0, safaricom: 0, total: 0 };

    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    const historicalEthio = summaries?.reduce((acc, curr) => {
      if (curr.month === MONTHS[currentMonthIdx] && curr.year === currentYear.toString()) return acc;
      return acc + (curr.ethio || 0);
    }, 0) || 0;

    const historicalSafaricom = summaries?.reduce((acc, curr) => {
      if (curr.month === MONTHS[currentMonthIdx] && curr.year === currentYear.toString()) return acc;
      return acc + (curr.safaricom || 0);
    }, 0) || 0;

    const currentMonthReports = reports?.filter(r => {
      const rDate = new Date(r.date);
      return rDate.getMonth() === currentMonthIdx && rDate.getFullYear() === currentYear;
    }) || [];

    const currentEthio = currentMonthReports.reduce((acc, curr) => acc + (curr.ethioCount || 0), 0);
    const currentSafaricom = currentMonthReports.reduce((acc, curr) => acc + (curr.safaricomCount || 0), 0);

    return {
      ethio: historicalEthio + currentEthio,
      safaricom: historicalSafaricom + currentSafaricom,
      total: (historicalEthio + currentEthio) + (historicalSafaricom + currentSafaricom)
    };
  }, [summaries, reports]);

  const ledger = useMemo(() => {
    const list: any[] = [];
    const now = new Date();

    summaries?.forEach(s => {
      list.push({
        id: s.id,
        label: `${s.month} ${s.year}`,
        ethio: s.ethio,
        safaricom: s.safaricom,
        total: s.total,
        status: 'Finalized',
        date: new Date(parseInt(s.year), MONTHS.indexOf(s.month), 1)
      });
    });

    const currentMonthReports = reports?.filter(r => {
      const rDate = new Date(r.date);
      return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
    }) || [];

    if (currentMonthReports.length > 0) {
      const ethio = currentMonthReports.reduce((acc, curr) => acc + (curr.ethioCount || 0), 0);
      const safaricom = currentMonthReports.reduce((acc, curr) => acc + (curr.safaricomCount || 0), 0);
      list.push({
        id: 'current_month_live',
        label: `${MONTHS[now.getMonth()]} ${now.getFullYear()} (Active)`,
        ethio,
        safaricom,
        total: ethio + safaricom,
        status: 'Operational',
        date: now
      });
    }

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [summaries, reports]);

  const analysis = useMemo(() => {
    if (ledger.length < 1) return null;

    const sortedLedger = [...ledger].sort((a, b) => a.date.getTime() - b.date.getTime());
    const chartData = sortedLedger.map(item => ({
      name: item.label.split(' ')[0].substring(0, 3),
      total: item.total,
      ethio: item.ethio,
      safaricom: item.safaricom
    }));

    const current = sortedLedger[sortedLedger.length - 1];
    const previous = sortedLedger[sortedLedger.length - 2];
    
    let growth = 0;
    if (previous && previous.total > 0) {
      growth = ((current.total - previous.total) / previous.total) * 100;
    }

    const ethioPct = aggregates.total > 0 ? (aggregates.ethio / aggregates.total) * 100 : 0;
    const safaricomPct = aggregates.total > 0 ? (aggregates.safaricom / aggregates.total) * 100 : 0;

    return { chartData, growth, ethioPct, safaricomPct };
  }, [ledger, aggregates]);

  if (isUserLoading || isSummariesLoading || isReportsLoading) {
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
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Bureau Unified Ledger</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline">Full Registration</h1>
          <p className="text-sm text-muted-foreground max-w-lg">Grand aggregate of finalized archives and active operational reports since July 2025.</p>
        </div>
        <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3 px-4 border-r border-border">
            <div className="p-2 bg-emerald-500/10 rounded-xl"><ShieldCheck className="h-5 w-5 text-emerald-500" /></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Sync Status</span>
              <span className="text-sm font-black text-foreground">Verified</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-primary/10 rounded-xl"><Calendar className="h-5 w-5 text-primary" /></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Operational Period</span>
              <span className="text-sm font-black text-foreground">Since July '25</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard label="Grand Aggregate" value={aggregates.total} icon={TrendingUp} color="text-primary" />
        <StatsCard label="Total Ethio Line" value={aggregates.ethio} icon={Phone} color="text-emerald-500" />
        <StatsCard label="Total Safaricom Line" value={aggregates.safaricom} icon={Smartphone} color="text-orange-500" />
      </div>

      {analysis && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-border bg-card overflow-hidden rounded-3xl shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Operational Trend Analysis</CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Registration throughput over time</p>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground opacity-20" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} 
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border shadow-2xl p-3 rounded-xl">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{payload[0].payload.name}</p>
                              <div className="space-y-1">
                                <p className="text-sm font-black text-foreground tracking-tighter">Total: {payload[0].value}</p>
                                <p className="text-[9px] font-bold text-emerald-600 uppercase">Ethio: {payload[0].payload.ethio}</p>
                                <p className="text-[9px] font-bold text-orange-600 uppercase">Safaricom: {payload[0].payload.safaricom}</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-border bg-card overflow-hidden rounded-3xl shadow-sm">
              <CardContent className="p-6">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">MoM Performance Growth</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-foreground tracking-tighter">
                    {Math.abs(analysis.growth).toFixed(1)}%
                  </span>
                  <div className={`flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                    analysis.growth >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {analysis.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {analysis.growth >= 0 ? 'Increase' : 'Decline'}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-2">vs. previous operational period</p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card overflow-hidden rounded-3xl shadow-sm">
              <CardContent className="p-6 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Bureau Distribution Share</p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-emerald-600">Ethio Intake</span>
                      <span className="text-foreground">{analysis.ethioPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${analysis.ethioPct}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-orange-600">Safaricom Intake</span>
                      <span className="text-foreground">{analysis.safaricomPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${analysis.safaricomPct}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <Card className="border border-border bg-card overflow-hidden rounded-3xl shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border py-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Bureau Performance Ledger</CardTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Consolidated monthly throughput</p>
            </div>
            <div className="h-8 px-3 rounded-lg bg-primary/10 flex items-center gap-2">
               <Activity className="h-3.5 w-3.5 text-primary" />
               <span className="text-[9px] font-black text-primary uppercase">Real-time Calculation Active</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 pl-8">Reporting Month</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Ethio Intake</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Safaricom Intake</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Grand Total</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 pr-8 text-right">Data Protocol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length > 0 ? ledger.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-border h-20">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                        <Calendar className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                      <span className="text-sm font-black text-foreground">{item.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-emerald-600">{item.ethio.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-bold text-orange-600">{item.safaricom.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-primary/5 text-sm font-black text-primary ring-1 ring-primary/10">
                      {item.total.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest border ${
                      item.status === 'Finalized' 
                        ? 'bg-muted text-muted-foreground border-border' 
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {item.status}
                    </span>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Activity className="h-10 w-10 text-muted-foreground/20" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Terminal Scan Complete: Zero Matches Since July '25</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-[10px] text-amber-600 font-bold uppercase leading-relaxed tracking-widest">
          Operational Security: This terminal reflects finalized bureau throughput. Monthly summaries are generated automatically upon the conclusion of each operational period. Manual corrections require administrative clearance.
        </p>
      </div>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
          <div className={`p-2 rounded-lg bg-muted/50 ${color}`}><Icon className="h-4 w-4" /></div>
        </div>
        <p className="text-4xl font-black text-foreground tracking-tighter">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
