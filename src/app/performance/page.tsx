
'use client';

import { useMemo, useState } from 'react';
import { useMemoFirebase, useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Trophy, 
  XCircle, 
  CheckCircle2, 
  Loader2, 
  TrendingUp, 
  AlertCircle,
  FileDigit,
  User,
  Search,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { Registration } from '@/lib/types';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default function PerformancePage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'registrations'),
      where('assignedReviewerId', '==', user.uid),
      limit(5000)
    );
  }, [db, user]);

  const { data: registrations, isLoading } = useCollection<Registration>(registrationsQuery);

  const stats = useMemo(() => {
    if (!registrations || registrations.length === 0) return {
      total: 0,
      processed: 0,
      rejected: 0,
      successRate: 0,
      rejectionRate: 0,
      chartData: []
    };

    const total = registrations.length;
    const processed = registrations.filter(r => r.status === 'Processed').length;
    const rejected = registrations.filter(r => r.status === 'Rejected').length;
    const processing = registrations.filter(r => r.status === 'Processing').length;
    const pending = registrations.filter(r => r.status === 'Pending Review').length;
    const failed = registrations.filter(r => r.status === 'Failed').length;

    const chartData = [
      { name: 'Success', value: processed, color: 'hsl(var(--primary))' },
      { name: 'Rejected', value: rejected, color: 'hsl(var(--destructive))' },
      { name: 'Other', value: processing + pending + failed, color: 'hsl(var(--muted-foreground))' },
    ];

    return {
      total,
      processed,
      rejected,
      successRate: ((processed / total) * 100).toFixed(1),
      rejectionRate: ((rejected / total) * 100).toFixed(1),
      chartData
    };
  }, [registrations]);

  const rejectedRegistrations = useMemo(() => {
    if (!registrations) return [];
    return registrations
      .filter(r => r.status === 'Rejected')
      .filter(r => 
        r.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.includes(searchTerm)
      )
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [registrations, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Bureau Performance</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Official Quality & Accuracy Metrics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle2 className="h-20 w-20 text-primary" />
          </div>
          <CardContent className="p-8">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Success Rate</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-foreground tracking-tighter">{stats.successRate}%</span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Target: 85%+
              </span>
            </div>
            <div className="mt-6 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000" 
                style={{ width: `${stats.successRate}%` }} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <XCircle className="h-20 w-20 text-destructive" />
          </div>
          <CardContent className="p-8">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Rejection Rate</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-foreground tracking-tighter">{stats.rejectionRate}%</span>
              <span className="text-[10px] font-bold text-amber-500 uppercase">Audit Threshold: 15%</span>
            </div>
            <div className="mt-6 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-destructive transition-all duration-1000" 
                style={{ width: `${stats.rejectionRate}%` }} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden flex items-center justify-center p-6">
           <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Rejection Audit Registry
            </h2>
            <p className="text-xs font-medium text-muted-foreground">List of registration submissions flagged for rejection with recorded justification.</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
            <Input 
              placeholder="Search rejected records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-border bg-card rounded-xl text-xs"
            />
          </div>
        </div>

        <Card className="border border-border bg-card shadow-sm rounded-3xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pl-8">Applicant</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">Registry ID</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">Audit Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">Protocol Failure Reason</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pr-8 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rejectedRegistrations.length > 0 ? rejectedRegistrations.map((reg) => (
                <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors border-border h-20">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border border-border">
                        <User className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                      <span className="text-sm font-black text-foreground">{reg.applicantName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground/40 uppercase">
                      <FileDigit className="h-3 w-3" />
                      {reg.id.substring(0, 15)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">
                      {format(new Date(reg.submissionDate), 'MMM dd, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-xs font-bold text-rose-700">{reg.rejectionReason || "Unspecified Discrepancy"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <StatusBadge status="Rejected" className="scale-90 origin-right" />
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 opacity-20">
                      <CheckCircle2 className="h-12 w-12 text-primary" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Zero Protocol Failures Detected in Scope</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-4">
        <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0" />
        <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed tracking-widest">
          Operational Security: This terminal reflects localized field performance metrics. Rejection rates exceeding 15% across a 30-day operational period will trigger an automatic administrative performance review. Data is synchronized with headquarters every 60 seconds.
        </p>
      </div>
    </div>
  );
}
