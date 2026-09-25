
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Calendar,
  Zap,
  ShieldCheck,
  Target,
  ArrowUpRight,
  History,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart,
  Layers,
  Sparkles
} from 'lucide-react';
import { Registration, DailyReport, UserProfile } from '@/lib/types';
import { format, subDays, eachMonthOfInterval, subMonths, eachDayOfInterval, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Requested Status Color Protocol
const COLORS = {
  processed: '#10b981', // Green
  processing: '#f59e0b', // Yellow
  rejected: '#ef4444',  // Red
  failed: '#64748b',    // Grey
};

export default function FullPerformancePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [analysisScope, setAnalysisScope] = useState<'current' | 'history'>('current');

  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const isAdmin = profile?.role === 'admin';

  // Registrations Query (Strict Isolation if not admin)
  const regsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    if (isAdmin) return query(collection(db, 'registrations'), limit(10000));
    return query(collection(db, 'registrations'), where('assignedReviewerId', '==', user.uid), limit(10000));
  }, [db, user, isAdmin]);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    if (isAdmin) return query(collection(db, 'daily_reports'), limit(10000));
    return query(collection(db, 'daily_reports'), where('officerId', '==', user.uid), limit(10000));
  }, [db, user, isAdmin]);

  const { data: registrations, isLoading: isRegsLoading } = useCollection<Registration>(regsQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);

  const stats = useMemo(() => {
    if (!registrations || !mounted) return null;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const filteredRegs = analysisScope === 'current' 
      ? registrations.filter(r => isWithinInterval(new Date(r.submissionDate), { start: monthStart, end: monthEnd }))
      : registrations;

    const total = filteredRegs.length;
    if (total === 0) return null;

    const counts = {
      processed: filteredRegs.filter(r => r.status === 'Processed').length,
      processing: filteredRegs.filter(r => r.status === 'Processing' || r.status === 'Pending Review').length,
      rejected: filteredRegs.filter(r => r.status === 'Rejected').length,
      failed: filteredRegs.filter(r => r.status === 'Failed').length,
    };

    const successRate = Number(((counts.processed / total) * 100).toFixed(1));

    const pieData = [
      { name: 'Processed', value: counts.processed, color: COLORS.processed },
      { name: 'Active', value: counts.processing, color: COLORS.processing },
      { name: 'Rejected', value: counts.rejected, color: COLORS.rejected },
      { name: 'Failed', value: counts.failed, color: COLORS.failed },
    ];

    const radialData = [{ name: 'Success', value: successRate, fill: COLORS.processed }];

    return { total, counts, successRate, pieData, radialData };
  }, [registrations, mounted, analysisScope]);

  const trends = useMemo(() => {
    if (!reports || !mounted) return null;

    const now = new Date();

    // Daily Velocity (30 Days)
    const dailyTrend = eachDayOfInterval({ start: subDays(now, 29), end: now }).map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTotal = reports.filter(r => r.date === dateStr).reduce((acc, curr) => acc + (curr.total || 0), 0);
      return { label: format(date, 'MMM dd'), value: dayTotal };
    });

    // Monthly Velocity (12 Months)
    const monthlyTrend = eachMonthOfInterval({ start: subMonths(now, 11), end: now }).map(date => {
      const monthStr = format(date, 'yyyy-MM');
      const monthTotal = reports.filter(r => r.date.startsWith(monthStr)).reduce((acc, curr) => acc + (curr.total || 0), 0);
      return { label: format(date, 'MMM yy'), value: monthTotal };
    });

    // Yearly Momentum (3 Years)
    const yearlyTrend = [0, 1, 2].map(i => now.getFullYear() - i).reverse().map(year => {
      const yearTotal = reports.filter(r => r.date.startsWith(year.toString())).reduce((acc, curr) => acc + (curr.total || 0), 0);
      return { label: year.toString(), value: yearTotal };
    });

    return { dailyTrend, monthlyTrend, yearlyTrend };
  }, [reports, mounted]);

  if (isUserLoading || isRegsLoading || isReportsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header Command */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Bureau High-Command Protocol</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Full Intel Matrix</h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            {isAdmin ? 'Bureau-wide lifecycle synchronization' : 'Personal throughput and quality velocity'}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-card p-3 rounded-[2rem] border shadow-sm">
          <Tabs value={analysisScope} onValueChange={(v: any) => setAnalysisScope(v)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full h-11 bg-muted/50 rounded-2xl p-1 border border-border">
              <TabsTrigger value="current" className="text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Current Pulse</TabsTrigger>
              <TabsTrigger value="history" className="text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Bureau Legacy</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {!stats ? (
        <div className="flex flex-col items-center justify-center py-40 bg-card rounded-[32px] border border-dashed text-muted-foreground/30">
          <Layers className="h-16 w-16 mb-4 opacity-10" />
          <p className="text-sm font-black uppercase tracking-[0.3em]">Matrix Data Depleted</p>
          <p className="text-xs italic mt-2">No registrations detected for the selected horizon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Success Radial Column */}
          <div className="xl:col-span-4 space-y-8">
             <Card className="border border-border bg-card shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center p-10 relative group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                  <Target className="h-40 w-40" />
                </div>
                
                <div className="h-[220px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={20} data={stats.radialData} startAngle={180} endAngle={0}>
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar background dataKey="value" cornerRadius={30} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-12">
                     <span className="text-6xl font-black text-foreground tracking-tighter">{stats.successRate}%</span>
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Success Protocol</p>
                  </div>
                </div>

                <div className="w-full space-y-6 pt-6 relative z-10">
                   <div className="flex items-center justify-center gap-3">
                     <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 shadow-sm">
                        <Zap className="h-5 w-5" />
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">System Efficiency</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Real-time Verification Accuracy</p>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/30 rounded-2xl border border-border text-center">
                         <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Processed</p>
                         <p className="text-xl font-black text-emerald-600 tabular-nums">{stats.counts.processed}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-2xl border border-border text-center">
                         <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active</p>
                         <p className="text-xl font-black text-amber-500 tabular-nums">{stats.counts.processing}</p>
                      </div>
                   </div>
                </div>
             </Card>

             <Card className="border border-border bg-card rounded-[2.5rem] p-8 shadow-sm">
                <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" /> Lifecycle Distribution
                </CardTitle>
                <div className="space-y-4">
                   {stats.pieData.map((item) => (
                     <div key={item.name} className="flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                           <span className="text-xs font-black text-foreground uppercase tracking-tight">{item.name}</span>
                        </div>
                        <span className="text-sm font-black tabular-nums">{item.value.toLocaleString()}</span>
                     </div>
                   ))}
                </div>
             </Card>
          </div>

          {/* Velocity Trends Column */}
          <div className="xl:col-span-8 space-y-8">
             {/* Daily Trend */}
             <Card className="border border-border bg-card shadow-sm rounded-[2.5rem] overflow-hidden group">
                <CardHeader className="bg-muted/30 border-b border-border py-5 px-8 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Daily Intake Velocity
                  </CardTitle>
                  <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest">30-Day Protocol</div>
                </CardHeader>
                <CardContent className="p-8">
                   <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={trends?.dailyTrend || []}>
                            <defs>
                               <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip content={({ active, payload }) => {
                              if (active && payload?.length) {
                                return (
                                  <div className="bg-card border border-border shadow-2xl p-4 rounded-2xl">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{payload[0].payload.label}</p>
                                    <p className="text-xl font-black text-foreground">{payload[0].value} Units</p>
                                  </div>
                                );
                              }
                              return null;
                            }} />
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorDaily)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </CardContent>
             </Card>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Monthly Trend */}
                <Card className="border border-border bg-card shadow-sm rounded-[2.5rem] overflow-hidden">
                   <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                      <CardTitle className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                         <BarChart3 className="h-3.5 w-3.5 text-primary" /> Monthly Aggregates
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="p-6">
                      <div className="h-[180px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends?.monthlyTrend || []}>
                               <XAxis dataKey="label" hide />
                               <Tooltip />
                               <Area type="step" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} strokeWidth={2} />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="mt-4 flex items-center justify-between px-2">
                         <p className="text-[8px] font-black text-muted-foreground uppercase">12-Month Performance Span</p>
                         <LineChart className="h-3 w-3 text-blue-500 opacity-30" />
                      </div>
                   </CardContent>
                </Card>

                {/* Yearly Trend */}
                <Card className="border border-border bg-card shadow-sm rounded-[2.5rem] overflow-hidden">
                   <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                      <CardTitle className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                         <Calendar className="h-3.5 w-3.5 text-primary" /> Yearly Momentum
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="p-6">
                      <div className="h-[180px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends?.yearlyTrend || []}>
                               <XAxis dataKey="label" hide />
                               <Tooltip />
                               <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={2} />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="mt-4 flex items-center justify-between px-2">
                         <p className="text-[8px] font-black text-muted-foreground uppercase">Bureau Lifecycle Growth</p>
                         <TrendingUp className="h-3 w-3 text-emerald-500 opacity-30" />
                      </div>
                   </CardContent>
                </Card>
             </div>

             {/* Failure Audit Quick Box */}
             <Card className="border border-border bg-card shadow-sm rounded-[2.5rem] p-8 border-l-[6px] border-l-rose-500">
                <div className="flex items-start justify-between">
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <h3 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-rose-500" /> Integrity Audit
                         </h3>
                         <p className="text-xs text-muted-foreground font-medium">Monitoring protocol rejections and technical failures.</p>
                      </div>
                      
                      <div className="flex items-center gap-8">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Rejections</p>
                            <p className="text-3xl font-black text-rose-600 tabular-nums">{stats.counts.rejected}</p>
                         </div>
                         <div className="h-8 w-px bg-border" />
                         <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">System Errors</p>
                            <p className="text-3xl font-black text-slate-500 tabular-nums">{stats.counts.failed}</p>
                         </div>
                      </div>
                   </div>
                   <Button variant="outline" className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest border-border hover:bg-rose-500 hover:text-white transition-all" asChild>
                      <a href="/performance">Detailed Audit</a>
                   </Button>
                </div>
             </Card>
          </div>
        </div>
      )}

      {/* Security Disclaimer */}
      <div className="p-8 bg-primary/[0.03] border border-primary/10 rounded-[2.5rem] flex items-center gap-6">
        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
          <ShieldCheck className="h-7 w-7 text-primary-foreground" />
        </div>
        <p className="text-[11px] text-foreground font-black uppercase leading-relaxed tracking-widest max-w-5xl">
          Authorized Intelligence Protocol: This terminal calculates analytical rates across the entire operational lifecycle (since July 2025). Data isolation is strictly enforced; analysts cannot view signatures outside their authorized sector. All trend lines are derived from finalized bureau ledgers and signed operational reports.
        </p>
      </div>
    </div>
  );
}
