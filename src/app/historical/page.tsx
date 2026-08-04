
"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  ArrowLeft, 
  Trash2, 
  Database,
  Calendar,
  Save,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  Edit2,
  X,
  ShieldAlert,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { MonthlySummary } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() - 5 + i).toString()).reverse();

export default function HistoricalDataPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Deletion State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [summaryToDelete, setSummaryToDelete] = useState<{id: string, label: string} | null>(null);
  
  // Form State
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [ethio, setEthio] = useState('0');
  const [safaricom, setSafaricom] = useState('0');
  
  // Breakdown State
  const [processed, setProcessed] = useState('0');
  const [processing, setProcessing] = useState('0');
  const [rejected, setRejected] = useState('0');
  const [failed, setFailed] = useState('0');
  const [pendingReview, setPendingReview] = useState('0');

  // Fetch summaries for this officer
  const summariesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'monthly_summaries'),
      where('officerId', '==', user.uid)
    );
  }, [db, user]);

  const { data: rawHistory, isLoading } = useCollection<MonthlySummary>(summariesQuery);

  const history = useMemo(() => {
    if (!rawHistory) return [];
    return [...rawHistory].sort((a, b) => {
      const yearA = parseInt(a.year);
      const yearB = parseInt(b.year);
      if (yearA !== yearB) return yearB - yearA;
      return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
    });
  }, [rawHistory]);

  const handleAddData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    const eVal = parseInt(ethio) || 0;
    const sVal = parseInt(safaricom) || 0;

    const summaryData = {
      officerId: user.uid,
      month,
      year,
      ethio: eVal,
      safaricom: sVal,
      total: eVal + sVal,
      processed: parseInt(processed) || 0,
      processing: parseInt(processing) || 0,
      rejected: parseInt(rejected) || 0,
      failed: parseInt(failed) || 0,
      pendingReview: parseInt(pendingReview) || 0,
      timestamp: serverTimestamp(),
    };

    const summaryId = editingId || `${user.uid}_${month}_${year}`;
    
    setDocumentNonBlocking(doc(db, 'monthly_summaries', summaryId), summaryData, { merge: true });
    
    setIsModalOpen(false);
    resetForm();

    toast({
      title: editingId ? "Summary Updated" : "Monthly Summary Saved",
      description: `Summary for ${month} ${year} has been synchronized successfully.`,
    });
  };

  const handleEdit = (entry: MonthlySummary) => {
    setEditingId(entry.id);
    setMonth(entry.month);
    setYear(entry.year);
    setEthio(entry.ethio.toString());
    setSafaricom(entry.safaricom.toString());
    setProcessed((entry.processed || 0).toString());
    setProcessing((entry.processing || 0).toString());
    setRejected((entry.rejected || 0).toString());
    setFailed((entry.failed || 0).toString());
    setPendingReview((entry.pendingReview || 0).toString());
    setIsModalOpen(true);
  };

  const initiateDelete = (id: string, label: string) => {
    setSummaryToDelete({ id, label });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!db || !summaryToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDocumentNonBlocking(doc(db, 'monthly_summaries', summaryToDelete.id));
      toast({
        title: "Archive Entry Purged",
        description: `Historical data for ${summaryToDelete.label} has been removed.`,
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: "Protocol error during ledger purge.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setSummaryToDelete(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setMonth(MONTHS[new Date().getMonth()]);
    setYear(new Date().getFullYear().toString());
    setEthio('0');
    setSafaricom('0');
    setProcessed('0');
    setProcessing('0');
    setRejected('0');
    setFailed('0');
    setPendingReview('0');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <Link href="/registrations" className="flex items-center text-[10px] font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest gap-1.5">
        <ArrowLeft className="h-3 w-3" /> Return to Registry
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Historical Data Ledger</h1>
          <p className="text-sm text-muted-foreground">Manage and review monthly registration archives from previous operational periods.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button variant="outline" className="font-bold border-border bg-card text-foreground h-11 px-6 rounded-xl text-[10px] uppercase tracking-widest">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> Export Archive
          </Button>
          <Dialog open={isModalOpen} onOpenChange={(o) => { if(!o) resetForm(); setIsModalOpen(o); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest h-11 px-8 rounded-xl shadow-xl shadow-primary/10">
                <Plus className="mr-2 h-4 w-4" /> Archive Data
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-popover">
              <DialogHeader className="p-8 border-b border-border bg-muted/30">
                <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tighter">
                  {editingId ? 'Modify Archive Entry' : 'Monthly Summary Entry'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddData} className="p-8 space-y-8 bg-card">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Reporting Month</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger className="h-12 bg-background border-border rounded-xl font-bold text-xs">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold text-xs">{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Reporting Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="h-12 bg-background border-border rounded-xl font-bold text-xs">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={y} className="font-bold text-xs">{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Ethio Intake</Label>
                    <Input 
                      type="number" 
                      value={ethio} 
                      onChange={e => setEthio(e.target.value)}
                      className="h-12 bg-background border-border rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Safaricom Intake</Label>
                    <Input 
                      type="number" 
                      value={safaricom} 
                      onChange={e => setSafaricom(e.target.value)}
                      className="h-12 bg-background border-border rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Operational Breakdown</h3>
                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">Detailed Performance Data</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <StatusField label="Processed" value={processed} onChange={setProcessed} color="emerald" />
                    <StatusField label="Processing" value={processing} onChange={setProcessing} color="blue" />
                    <StatusField label="Pending" value={pendingReview} onChange={setPendingReview} color="amber" />
                    <StatusField label="Rejected" value={rejected} onChange={setRejected} color="rose" />
                    <StatusField label="Failed" value={failed} onChange={setFailed} color="slate" />
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex flex-col gap-3">
                  <Button type="submit" className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/10">
                    <Save className="mr-2 h-4 w-4" /> {editingId ? 'Commit Changes' : 'Synchronize with Archive'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { resetForm(); setIsModalOpen(false); }}
                    className="h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground"
                  >
                    Abort Operation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border border-border bg-card overflow-hidden rounded-3xl shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border py-4">
          <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Database className="h-3.5 w-3.5" /> Bureau Archive Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="py-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
            ) : history.map((entry) => {
              const label = `${entry.month} ${entry.year}`;
              return (
                <div key={entry.id} className="group flex items-center justify-between p-6 hover:bg-muted/30 transition-all border-border border-b last:border-0 h-24">
                  <div className="flex-1 flex items-center gap-10">
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <div className="p-3 rounded-2xl bg-muted/50 border border-border group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                        <Calendar className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="text-lg font-black text-foreground tracking-tight">{label}</h3>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-8">
                      <MetricItem label="Grand Total" value={entry.total} color="text-primary" />
                      <MetricItem label="Ethio Intake" value={entry.ethio} color="text-foreground/80" />
                      <MetricItem label="Safaricom" value={entry.safaricom} color="text-foreground/80" />
                      <MetricItem label="Processed" value={entry.processed || 0} color="text-emerald-600" />
                      <MetricItem label="Rejected" value={entry.rejected || 0} color="text-rose-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all ml-6">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                      asChild
                    >
                      <Link href={`/previous?month=${entry.month}&year=${entry.year}`}>
                        <TrendingUp className="mr-2 h-4 w-4" /> Analysis
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
                      onClick={() => initiateDelete(entry.id, label)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {!isLoading && history.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/5">
                <div className="p-6 bg-muted rounded-full mb-6 border border-border shadow-inner">
                   <Database className="h-12 w-12 opacity-10" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.2em]">Archive Vault Empty</p>
                <p className="text-xs font-medium mt-2">Initialize synchronization to begin digitizing bureau records.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-3 p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <p className="text-[10px] text-amber-600 font-bold uppercase leading-relaxed tracking-widest max-w-4xl">
          Protocol Reminder: Archived throughput data is strictly isolated to your official signature. These records are subject to forensic auditing. Modifications to finalized historical summaries are logged in the bureau's audit ledger.
        </p>
      </div>

      {/* Professional Deletion Protocol */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-md p-0 overflow-hidden">
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto bg-destructive/10 p-5 rounded-2xl w-fit">
              {isDeleting ? <Loader2 className="h-10 w-10 text-destructive animate-spin" /> : <Trash2 className="h-10 w-10 text-destructive" />}
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                {isDeleting ? "PURGING ARCHIVE..." : "PERMANENT DELETION"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed font-medium">
                {isDeleting 
                  ? `Removing historical data for ${summaryToDelete?.label}. Please stand by...`
                  : `You are about to purge the archive entry for ${summaryToDelete?.label}. This action will permanently remove the record from the bureau's centralized historical ledger.`
                }
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-col gap-3">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); confirmDelete(); }} 
              disabled={isDeleting}
              className="w-full h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/10 active:scale-[0.98] transition-all"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Purge"}
            </AlertDialogAction>
            {!isDeleting && (
              <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-none bg-transparent hover:bg-card">
                Abort Protocol
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricItem({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">{label}</span>
      <span className={cn("text-base font-black tabular-nums", color)}>{value.toLocaleString()}</span>
    </div>
  );
}

function StatusField({ label, value, onChange, color }: any) {
  const borderClasses: any = {
    emerald: "focus-within:border-emerald-500/50",
    blue: "focus-within:border-blue-500/50",
    amber: "focus-within:border-amber-500/50",
    rose: "focus-within:border-rose-500/50",
    slate: "focus-within:border-slate-500/50",
  };

  return (
    <div className={cn("space-y-1.5 p-3 bg-muted/50 rounded-xl border border-border transition-all", borderClasses[color])}>
      <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">{label}</Label>
      <Input 
        type="number" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className="h-8 border-none bg-transparent p-0 text-sm font-black focus-visible:ring-0" 
      />
    </div>
  );
}
