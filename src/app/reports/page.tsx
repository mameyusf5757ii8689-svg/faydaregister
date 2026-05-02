"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart3, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  FileDigit,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, limit, where } from 'firebase/firestore';
import { Registration } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export default function ReportsPage() {
  const { user } = useUser();
  const db = useFirestore();
  
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Filter registrations so officers only see analytics for records they are responsible for
    return query(
      collection(db, 'registrations'), 
      where('assignedReviewerId', '==', user.uid),
      limit(1000)
    );
  }, [db, user]);

  const { data: registrations, isLoading } = useCollection<Registration>(registrationsQuery);

  const filteredData = useMemo(() => {
    if (!registrations) return [];
    return registrations.filter(reg => {
      const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
      
      let matchesDate = true;
      try {
        const regDate = new Date(reg.submissionDate);
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        matchesDate = isWithinInterval(regDate, { start, end });
      } catch (e) {
        matchesDate = true;
      }

      const matchesSearch = searchTerm === '' || 
        reg.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.id.includes(searchTerm) ||
        reg.phone.includes(searchTerm);

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [registrations, statusFilter, startDate, endDate, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: filteredData.length,
      processed: filteredData.filter(r => r.status === 'Processed').length,
      processing: filteredData.filter(r => r.status === 'Processing').length,
      rejected: filteredData.filter(r => r.status === 'Rejected').length,
      failed: filteredData.filter(r => r.status === 'Failed').length,
      pending: filteredData.filter(r => r.status === 'Pending Review').length,
    };
  }, [filteredData]);

  const chartData = useMemo(() => {
    return [
      { name: 'Processed', value: stats.processed, color: '#10b981' },
      { name: 'Processing', value: stats.processing, color: '#3b82f6' },
      { name: 'Pending', value: stats.pending, color: '#f59e0b' },
      { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
      { name: 'Failed', value: stats.failed, color: '#64748b' },
    ];
  }, [stats]);

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
            <BarChart3 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground font-headline">Operational Intelligence</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Local Registry Analytics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Filter className="h-3 w-3" /> Triage Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Search Terminal</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                  <Input 
                    placeholder="ID, Name, Phone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-border bg-background rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Operational Period</label>
                <div className="grid grid-cols-1 gap-2">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 border-border bg-background rounded-xl text-xs" />
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 border-border bg-background rounded-xl text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Current Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 border-border bg-background rounded-xl text-xs font-bold">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">All Categories</SelectItem>
                    <SelectItem value="Processed" className="text-xs font-bold">Processed</SelectItem>
                    <SelectItem value="Processing" className="text-xs font-bold">Processing</SelectItem>
                    <SelectItem value="Rejected" className="text-xs font-bold">Rejected</SelectItem>
                    <SelectItem value="Failed" className="text-xs font-bold">Failed</SelectItem>
                    <SelectItem value="Pending Review" className="text-xs font-bold">Pending Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-widest border-border text-muted-foreground hover:text-foreground" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                Reset Matrix
              </Button>
            </CardContent>
          </Card>
          
          <div className="p-6 bg-primary/[0.03] border border-primary/10 rounded-2xl space-y-4">
             <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Local Efficiency</span>
             </div>
             <div className="space-y-1">
                <p className="text-3xl font-black text-foreground tracking-tighter">{filteredData.length}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Your records in scope</p>
             </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Intake" value={stats.total} color="blue" icon={FileText} />
            <StatCard label="Finalized" value={stats.processed} color="green" icon={CheckCircle2} />
            <StatCard label="Active" value={stats.processing} color="indigo" icon={Clock} />
            <StatCard label="Purged" value={stats.rejected} color="red" icon={XCircle} />
            <StatCard label="Error" value={stats.failed} color="slate" icon={AlertCircle} />
            <StatCard label="Verify" value={stats.pending} color="amber" icon={Clock} />
          </div>

          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-3xl">
            <CardHeader className="bg-muted/30 border-b border-border py-6 flex flex-row items-center justify-between">
               <div>
                  <CardTitle className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Your Distribution</CardTitle>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Real-time status allocation</p>
               </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }}
                      textAnchor="middle"
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border shadow-2xl p-4 rounded-2xl">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{payload[0].payload.name}</p>
                              <p className="text-xl font-black text-foreground tracking-tighter">{payload[0].value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-3xl">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
               <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Detail Registry Ledger</h3>
               <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9 rounded-xl font-black text-[9px] uppercase tracking-widest border-border bg-background">
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Export XLS
                  </Button>
               </div>
            </div>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pl-8 text-muted-foreground">Registry ID</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground">Official Name</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground">Submission</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground">Category</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pr-8 text-right text-muted-foreground">Region</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((reg) => (
                  <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors border-border h-16">
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground/30">
                        <FileDigit className="h-3 w-3" />
                        {reg.id.substring(0, 12)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-black text-foreground tracking-tight">
                        {reg.applicantName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[11px] font-bold text-muted-foreground">
                        {format(new Date(reg.submissionDate), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={reg.status} className="scale-75 origin-left" />
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {reg.location.split(',')[0]}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-60 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Filter className="h-10 w-10 text-muted-foreground/20" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Terminal Scan Complete: Zero Matches</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }: any) {
  const textClasses: any = {
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/10",
    green: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10",
    indigo: "text-indigo-500 bg-indigo-500/5 border-indigo-500/10",
    red: "text-rose-500 bg-rose-500/5 border-rose-500/10",
    slate: "text-muted-foreground bg-muted/30 border-border",
    amber: "text-amber-500 bg-amber-500/5 border-amber-500/10",
  };

  return (
    <Card className={cn("border shadow-none rounded-2xl transition-all hover:scale-[1.02]", textClasses[color])}>
      <CardContent className="p-4 space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
        <div className="flex items-center justify-between">
           <p className="text-xl font-black tracking-tighter">{value}</p>
           <Icon className="h-3 w-3 opacity-30" strokeWidth={3} />
        </div>
      </CardContent>
    </Card>
  );
}
