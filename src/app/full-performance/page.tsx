
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, limit, doc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Calendar,
  BarChart3,
  Zap,
  ShieldCheck,
  Target,
  ArrowUpRight,
  History,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Registration, DailyReport, UserProfile } from '@/lib/types';
import { format, subDays, startOfMonth, startOfYear, eachMonthOfInterval, subMonths, subYears, eachDayOfInterval } from 'date-fns';
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
  BarChart,
  Bar
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = {
  processed: 'hsl(var(--primary))',
  processing: '#3b82f6',
  rejected: '#ef4444',
  failed: '#64748b',
  pending: '#f59e0b'
};

export default function FullPerformancePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const isAdmin = profile?.role === 'admin';

  // Registrations Query (Isolated if not admin)
  const regsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    if (isAdmin) return query(collection(db, 'registrations'), limit(10000));
    return query(collection(db, 'registrations'), where('assignedReviewerId', '==', user.uid), limit(10000));
  }, [db, user, isAdmin]);

  // Daily Reports Query
  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    if (isAdmin) return query(collection(db, 'daily_reports'), limit(10000));
    return query(collection(db, 'daily_reports'), where('officerId', '==', user.uid), limit(10000));
  }, [db, user, isAdmin]);

  const { data: registrations, isLoading: isRegsLoading } = useCollection<Registration>(regsQuery);
  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);

  const stats = useMemo(() => {
    if (!registrations || !mounted) return null;

    const total = registrations.length;
    if (total === 0) return null;

    const counts = {
      processed: registrations.filter(r => r.status === 'Processed').length,
      processing: registrations.filter(r => r.status === 'Processing').length,
      rejected: registrations.filter(r => r.status === 'Rejected').length,
      failed: registrations.filter(r => r.status === 'Failed').length,
      pending: registrations.filter(r => r.status === 'Pending Review').length,
    };

    const rates = {
      success: ((counts.processed / total) * 100).toFixed(1),
      triage: (((counts.processing + counts.pending) / total) * 100).toFixed(1),
      rejection: ((counts.rejected / total) * 100).toFixed(1),
      failure: ((counts.failed / total) * 100).toFixed(1),
    };

    const pieData = [
      { name: 'Processed', value: counts.processed, color: COLORS.processed },
      { name: 'Processing', value: counts.processing, color: COLORS.processing },
      { name: 'Rejected', value: counts.rejected, color: COLORS.rejected },
      { name: 'Failed', value: counts.failed, color: COLORS.failed },
      { name: 'Pending', value: counts.pending, color: COLORS.pending },
    ];

    return { total, counts, rates, pieData };
  }, [registrations, mounted]);

  const trends = useMemo(() => {
    if (!reports || !mounted) return null;

    const now = new Date();

    // 1. Daily Rate (Last 30 Days)
    const last30Days = eachDayOfInterval({ start: subDays(now, 29), end: now });
    const dailyTrend = last30Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTotal = reports.filter(r => r.date === dateStr).reduce((acc, curr) => acc + (curr.total || 0), 0);
      return { label: format(date, 'MMM dd'), value: dayTotal };
    });

    // 2. Monthly Rate (Last 12 Months)
    const last12Months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    const monthlyTrend = last12Months.map(date => {
      const monthStr = format(date, 'yyyy-MM');
      const monthTotal = reports.filter(r => r.date.startsWith(monthStr)).reduce((acc, curr) => acc + (curr.total || 0), 0);
      return { label: format(date, 'MMM yy'), value: monthTotal };
    });

    // 3. Yearly Rate (Last 3 Years)
    const last3Years = [0, 1, 2].map(i => now.getFullYear() - i).reverse();
    const yearlyTrend = last3Years.map(year => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Bureau Intelligence Protocol</p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Full Performance</h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            {isAdmin ? 'Bureau-wide comprehensive analysis' : 'Your personal lifecycle throughput matrix'}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-card p-4 rounded-[2rem] border shadow-sm">
          <div className="flex items-center gap-3 px-4 border-r border-border">
            <div className="p-2 bg-primary/10 rounded-xl"><ShieldCheck className="h-5 w-5 text-primary" /></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">System Status</span>
              <span className="text-sm font-black text-foreground">Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl"><History className="h-5 w-5 text-emerald-500" /></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Data Lifecycle</span>
              <span className="text-sm font-black text-foreground">Full History</span>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Rate Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RateCard label="Success Rate" value={stats?.rates.success || '0'} icon={CheckCircle2} color="text-primary" bg="bg-primary/5" />
        <RateCard label="Triage Rate" value={stats?.rates.triage || '0'} icon={Clock} color="text-blue-500" bg="bg-blue-500/5" />
        <RateCard label="Rejection Rate" value={stats?.rates.rejection || '0'} icon={XCircle} color="text-rose-500" bg="bg-rose-500/5" />
        <RateCard label="Failure Rate" value={stats?.rates.failure || '0'} icon={AlertCircle} color="text-slate-500" bg="bg-slate-500/5" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Distribution Deep Dive */}
        <Card className="xl:col-span-4 border border-border bg-card overflow-hidden rounded-[2rem] shadow-sm">
          <CardHeader className="bg-muted/30 border-b border-border py-6">
            <CardTitle className="text-sm font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" /> Lifecycle Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.pieData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats?.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats?.pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-border">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">{item.name}</span>
                    <span className="text-sm font-black text-foreground">{item.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Temporal Trends */}
        <div className="xl:col-span-8 space-y-8">
          {/* Daily Trend */}
          <Card className="border border-border bg-card overflow-hidden rounded-[2rem] shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-primary" /> Daily Registration Rate
              </CardTitle>
              <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Last 30 Days</span>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[200px] w-full">
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
                    <Tooltip cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border shadow-2xl p-4 rounded-2xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{payload[0].payload.label}</p>
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
            <Card className="border border-border bg-card overflow-hidden rounded-[2rem] shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" /> Monthly Aggregate
                </CardTitle>
                <span className="text-[9px] font-black bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full uppercase">Annual View</span>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends?.monthlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Yearly Trend */}
            <Card className="border border-border bg-card overflow-hidden rounded-[2rem] shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Yearly Momentum
                </CardTitle>
                <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full uppercase">Lifecycle View</span>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends?.yearlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip />
                      <Area type="stepAfter" dataKey="value" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.05} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="p-8 bg-primary/[0.03] border border-primary/10 rounded-[2.5rem] flex items-center gap-6">
        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
          <Target className="h-7 w-7 text-primary-foreground" />
        </div>
        <p className="text-[11px] text-foreground font-black uppercase leading-relaxed tracking-widest max-w-5xl">
          Authorized Intelligence Protocol: This terminal reflects calculated performance rates across your entire historical engagement lifecycle. All ratios and temporal trends are derived from finalized bureau ledgers and signed operational reports. Discrepancies are flagged for forensic audit.
        </p>
      </div>
    </div>
  );
}

function RateCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="border border-border bg-card shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-xl transition-all">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
          <div className={cn("p-3 rounded-2xl border border-border group-hover:scale-110 transition-transform", bg, color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-end gap-1.5">
          <p className="text-5xl font-black text-foreground tracking-tighter">{value}%</p>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground/30 mb-2" />
        </div>
      </CardContent>
    </Card>
  );
}
