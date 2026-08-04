
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMemoFirebase, useCollection, useUser, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ShieldAlert,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  Eye,
  Info,
  History,
  Zap,
  Target,
  ShieldCheck
} from 'lucide-react';
import { Registration, UserProfile } from '@/lib/types';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { format, addMonths, eachDayOfInterval, endOfMonth, isSameDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as ChartTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/audit';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';

const START_DATE = new Date(2025, 6, 1); // July 1, 2025

export default function PerformancePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedRejection, setSelectedRejection] = useState<Registration | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (mounted && !selectedMonth) {
      setSelectedMonth(format(new Date(), 'yyyy-MM'));
    }
  }, [mounted, selectedMonth]);

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

  const { data: registrations, isLoading } = useCollection<Registration>(registrationsQuery);

  const monthsList = useMemo(() => {
    const list = [];
    let curr = new Date(START_DATE);
    const now = new Date();
    while (curr <= now) {
      list.push({
        value: format(curr, 'yyyy-MM'),
        label: format(curr, 'MMMM yyyy')
      });
      curr = addMonths(curr, 1);
    }
    return list.reverse();
  }, []);

  const filteredByMonth = useMemo(() => {
    if (!registrations || !selectedMonth) return [];
    return registrations.filter(r => {
      const date = new Date(r.submissionDate);
      return format(date, 'yyyy-MM') === selectedMonth;
    });
  }, [registrations, selectedMonth]);

  const stats = useMemo(() => {
    if (!filteredByMonth || filteredByMonth.length === 0) return {
      total: 0, processed: 0, rejected: 0, successRate: 0, rejectionRate: 0,
      topReason: 'None', peakDay: { date: '-', success: 0 },
      chartData: [], trendData: [], radialData: [{ name: 'Quality', value: 0, fill: 'hsl(var(--primary))' }]
    };

    const total = filteredByMonth.length;
    const processed = filteredByMonth.filter(r => r.status === 'Processed').length;
    const rejected = filteredByMonth.filter(r => r.status === 'Rejected').length;
    const other = total - (processed + rejected);
    const successRate = Number(((processed / total) * 100).toFixed(1));
    const rejectionRate = Number(((rejected / total) * 100).toFixed(1));

    const chartData = [
      { name: 'Success', value: processed, color: 'hsl(var(--primary))' },
      { name: 'Rejected', value: rejected, color: 'hsl(var(--destructive))' },
      { name: 'Other', value: other, color: 'hsl(var(--muted-foreground))' },
    ];

    const reasonCounts: Record<string, number> = {};
    filteredByMonth.filter(r => r.status === 'Rejected').forEach(r => {
      const reason = r.rejectionReason || 'Unknown';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    const topReason = Object.entries(reasonCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Zero Discrepancies';

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate);
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

    const trendData = daysInterval.map(day => {
      const dayRegs = filteredByMonth.filter(r => isSameDay(new Date(r.submissionDate), day));
      return {
        date: format(day, 'dd MMM'),
        success: dayRegs.filter(r => r.status === 'Processed').length,
        rejected: dayRegs.filter(r => r.status === 'Rejected').length,
      };
    });

    const peakDay = trendData.reduce((prev, curr) => (curr.success > prev.success) ? curr : prev, { date: '-', success: 0 });
    const radialData = [{ name: 'Success Rate', value: successRate, fill: successRate >= 85 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }];

    return { total, processed, rejected, successRate, rejectionRate, topReason, peakDay, chartData, trendData, radialData };
  }, [filteredByMonth, selectedMonth]);

  const rejectedRegistrations = useMemo(() => {
    if (!filteredByMonth) return [];
    return filteredByMonth
      .filter(r => r.status === 'Rejected')
      .filter(r => r.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.includes(searchTerm))
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [filteredByMonth, searchTerm]);

  const handleExportExcel = () => {
    if (filteredByMonth.length === 0) return;
    const exportData = filteredByMonth.map(r => ({
      'ID': r.id, 'Applicant': r.applicantName, 'Date': format(new Date(r.submissionDate), 'yyyy-MM-dd'),
      'Status': r.status, 'Rejection Reason': r.rejectionReason || 'N/A', 'Location': r.location
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance");
    XLSX.writeFile(wb, `Performance_${selectedMonth}.xlsx`);
    toast({ title: "Excel Intelligence Exported", description: "Monthly performance registry generated." });
  };

  const handleExportPDF = () => {
    if (filteredByMonth.length === 0) return;
    const doc = new jsPDF();
    doc.text(`Performance Review: ${profile?.fullName || 'Official'}`, 14, 15);
    const rows = filteredByMonth.map(r => [r.id.substring(0, 15)+'...', r.applicantName, format(new Date(r.submissionDate), 'MMM dd'), r.status, r.rejectionReason || '-']);
    autoTable(doc, { startY: 30, head: [['RID', 'Applicant', 'Date', 'Status', 'Detail']], body: rows, theme: 'striped' });
    doc.save(`Performance_${selectedMonth}.pdf`);
    toast({ title: "PDF Ledger Generated", description: "Official documentation saved." });
  };

  const handleOpenForensicRecord = (reg: Registration) => {
    setSelectedRejection(reg);
    if (db && user && profile) {
      logAuditAction(db, user, profile.fullName, 'VERIFICATION_CHECK', reg.id, `Forensic Audit: Reviewed rejection for ${reg.applicantName}.`);
    }
  };

  if (isUserLoading || isLoading || !selectedMonth || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20"><TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-primary" /></div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Bureau Quality</h1>
              <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Personnel Accuracy Matrix</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 bg-card p-2 rounded-2xl border shadow-sm self-center md:self-auto">
          <div className="hidden sm:flex items-center gap-2 pl-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Period:</span>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] h-10 border-none bg-transparent font-bold text-sm">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {monthsList.map(m => <SelectItem key={m.value} value={m.value} className="font-bold">{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card className="border border-border bg-card shadow-sm rounded-[32px] overflow-hidden flex flex-col items-center justify-center p-6">
            <div className="h-[140px] w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" barSize={12} data={stats.radialData} startAngle={180} endAngle={0}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={30} />
                  </RadialBarChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
                  <span className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">{stats.successRate}%</span>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Accuracy</p>
               </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <Target className="h-3 w-3 text-emerald-600" />
              <span className="text-[9px] font-black text-emerald-700 uppercase">Target: 85%+</span>
            </div>
        </Card>

        <Card className={cn("border shadow-sm rounded-[32px] p-8 transition-all", stats.rejectionRate > 15 ? "border-destructive/30 bg-destructive/5" : "border-border bg-card")}>
          <div className="flex items-start justify-between mb-4">
             <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Rejection Rate</p>
                <p className={cn("text-4xl font-black tracking-tighter", stats.rejectionRate > 15 ? "text-destructive" : "text-foreground")}>{stats.rejectionRate}%</p>
             </div>
             <div className={cn("p-2 rounded-lg", stats.rejectionRate > 15 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}><XCircle className="h-4 w-4" /></div>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Impact: <span className={stats.rejectionRate > 15 ? "text-destructive font-black" : "text-foreground"}>{stats.rejected}</span> Purged</p>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-[32px] p-8">
          <div className="flex items-start justify-between mb-4">
             <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Peak Day</p>
                <p className="text-3xl font-black text-foreground tracking-tighter">{stats.peakDay.date}</p>
             </div>
             <div className="p-2 bg-primary/10 rounded-lg text-primary"><Zap className="h-4 w-4" /></div>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Throughput: <span className="text-foreground">{stats.peakDay.success}</span> Successes</p>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-[32px] p-8">
          <div className="flex items-start justify-between mb-4">
             <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Primary Flag</p>
                <p className="text-xl font-black text-foreground tracking-tight line-clamp-1">{stats.topReason}</p>
             </div>
             <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500"><ShieldAlert className="h-4 w-4" /></div>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Instances: <span className="text-rose-600">{stats.rejected}</span> Rejections</p>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-[32px] flex items-center justify-center p-4">
           <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={6} dataKey="value">
                  {stats.chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }} itemStyle={{ fontSize: '10px', fontBold: true, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="border border-border bg-card overflow-hidden rounded-[32px] shadow-sm">
         <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 md:px-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Quality Velocity</CardTitle>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Daily throughput analysis</p>
            </div>
            <History className="h-4 w-4 text-muted-foreground opacity-20" />
         </CardHeader>
         <CardContent className="p-4 md:p-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/><stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontBold: true, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontBold: true, fill: 'hsl(var(--muted-foreground))' }} />
                  <ChartTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (<div className="bg-card border border-border shadow-2xl p-3 rounded-xl space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{payload[0].payload.date}</p>
                        <p className="text-xs font-black text-primary">SUCCESS: {payload[0].value}</p>
                        <p className="text-xs font-black text-destructive">PURGED: {payload[1].value}</p>
                      </div>);
                    }
                    return null;
                  }} />
                  <Area type="monotone" dataKey="success" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" />
                  <Area type="monotone" dataKey="rejected" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorRejected)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
         </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card p-6 rounded-[32px] border border-border shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Rejection Audit
            </h2>
            <p className="text-xs font-medium text-muted-foreground">Detailed discrepancies for the selected period.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
              <Input placeholder="Filter records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 border-border bg-background rounded-xl text-xs" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={handleExportExcel} variant="outline" className="flex-1 h-11 px-4 rounded-xl border-emerald-500/20 text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-background">XLS</Button>
              <Button onClick={handleExportPDF} variant="outline" className="flex-1 h-11 px-4 rounded-xl border-rose-500/20 text-rose-500 font-bold text-[10px] uppercase tracking-widest bg-background">PDF</Button>
            </div>
          </div>
        </div>

        <Card className="border border-border bg-card shadow-sm rounded-[32px] overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border"><TableHead className="py-5 pl-10">Applicant</TableHead><TableHead className="py-5">ID</TableHead><TableHead className="py-5 text-center">Status</TableHead><TableHead className="py-5 pr-10 text-right">Action</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rejectedRegistrations.length > 0 ? rejectedRegistrations.map((reg) => (
                <TableRow key={reg.id} className="hover:bg-muted/30 border-border group h-20">
                  <TableCell className="pl-10"><span className="text-sm font-black text-foreground">{reg.applicantName}</span></TableCell>
                  <TableCell><span className="text-[10px] font-mono text-muted-foreground/40">{reg.id.substring(0, 15)}...</span></TableCell>
                  <TableCell className="text-center"><StatusBadge status="Rejected" className="scale-75" /></TableCell>
                  <TableCell className="pr-10 text-right"><Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all" onClick={() => handleOpenForensicRecord(reg)}><Eye className="mr-2 h-4 w-4" /> View</Button></TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-20"><CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-primary" /><p className="text-xs font-black uppercase tracking-widest">No Protocol Failures</p></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={!!selectedRejection} onOpenChange={(o) => !o && setSelectedRejection(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-popover">
          <DialogHeader className="p-6 md:p-8 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-rose-500/10 rounded-2xl"><ShieldAlert className="h-5 w-5 md:h-6 md:w-6 text-rose-500" /></div>
                <div>
                   <DialogTitle className="text-lg md:text-xl font-black text-foreground uppercase tracking-tight">Audit Deep-Dive</DialogTitle>
                   <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bureau Internal Security Record</DialogDescription>
                </div>
              </div>
              <StatusBadge status="Rejected" className="scale-90" />
            </div>
          </DialogHeader>
          <div className="p-6 md:p-8 space-y-8 bg-card relative overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 relative z-10">
              <div className="space-y-1"><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><User className="h-3 w-3" /> Identity</p><p className="text-sm font-black text-foreground">{selectedRejection?.applicantName}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Date</p><p className="text-sm font-black text-foreground">{selectedRejection ? format(new Date(selectedRejection.submissionDate), 'MMMM dd, yyyy') : '-'}</p></div>
            </div>
            <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-2 relative overflow-hidden z-10">
                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Protocol Failure Reason</p>
                <p className="text-base font-bold text-rose-700 leading-tight">{selectedRejection?.rejectionReason || "Data discrepancy detected."}</p>
            </div>
            <div className="space-y-2 z-10 relative">
               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Submission Payload</p>
               <div className="p-6 bg-muted/50 rounded-[24px] border border-border italic text-sm font-medium">"{selectedRejection?.content || "No narrative content detected."}"</div>
            </div>
          </div>
          <div className="p-4 border-t border-border bg-muted/30 flex justify-end"><Button onClick={() => setSelectedRejection(null)} className="font-black text-[10px] uppercase tracking-widest h-10 px-8 rounded-xl">Close Report</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
