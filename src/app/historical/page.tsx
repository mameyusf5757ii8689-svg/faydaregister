
"use client"

import { useState, useMemo } from 'react';
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
  AlertCircle
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

    // Use a predictable ID to prevent duplicates for the same month/year
    const summaryId = `${user.uid}_${month}_${year}`;
    
    setDocumentNonBlocking(doc(db, 'monthly_summaries', summaryId), summaryData, { merge: true });
    
    setIsModalOpen(false);
    resetForm();

    toast({
      title: "Monthly Summary Saved",
      description: `Summary for ${month} ${year} has been archived successfully.`,
    });
  };

  const resetForm = () => {
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

  const handleDelete = (id: string, label: string) => {
    if (!db) return;
    if (confirm(`Are you sure you want to permanently delete the historical data for ${label}?`)) {
      deleteDocumentNonBlocking(doc(db, 'monthly_summaries', id));
      toast({
        title: "Entry Removed",
        description: `Historical data for ${label} purged from ledger.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <Link href="/registrations" className="flex items-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider gap-1.5">
        <ArrowLeft className="h-3 w-3" /> Back to Registrations
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Historical Data Ledger</h1>
          <p className="text-sm text-muted-foreground">Manage and review monthly registration archives from previous operational periods.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button variant="outline" className="font-bold border-border bg-card text-foreground">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> Export Archive
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 shadow-md">
                <Plus className="mr-2 h-5 w-5" /> Archive Monthly Data
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-xl border-border shadow-2xl bg-popover">
              <DialogHeader className="p-6 border-b border-border bg-muted/30">
                <DialogTitle className="text-xl font-bold text-foreground">Monthly Summary Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddData} className="p-8 space-y-8 bg-card">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Month</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger className="h-11 bg-background border-border text-foreground">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="h-11 bg-background border-border text-foreground">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Ethio Intake</Label>
                    <Input 
                      type="number" 
                      value={ethio} 
                      onChange={e => setEthio(e.target.value)}
                      className="h-11 bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Safaricom Intake</Label>
                    <Input 
                      type="number" 
                      value={safaricom} 
                      onChange={e => setSafaricom(e.target.value)}
                      className="h-11 bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Status Breakdown</h3>
                    <span className="text-[10px] font-medium text-muted-foreground/50">Detailed performance metrics</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">Processed</Label>
                      <Input type="number" value={processed} onChange={e => setProcessed(e.target.value)} className="h-10 bg-background border-border text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">Processing</Label>
                      <Input type="number" value={processing} onChange={e => setProcessing(e.target.value)} className="h-10 bg-background border-border text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">Pending</Label>
                      <Input type="number" value={pendingReview} onChange={e => setPendingReview(e.target.value)} className="h-10 bg-background border-border text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-rose-500">Rejected</Label>
                      <Input type="number" value={rejected} onChange={e => setRejected(e.target.value)} className="h-10 bg-background border-border text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">Failed</Label>
                      <Input type="number" value={failed} onChange={e => setFailed(e.target.value)} className="h-10 bg-background border-border text-foreground" />
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex items-center justify-start gap-3 pt-6 border-t border-border sm:justify-start">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 font-bold h-11 px-8">
                    <Save className="mr-2 h-4 w-4" /> Save to Archive
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsModalOpen(false)}
                    className="h-11 px-8 font-bold border-border bg-background text-foreground"
                  >
                    Discard
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border border-border bg-card overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border py-4">
          <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Bureau History Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
            ) : history.map((entry) => {
              const label = `${entry.month} ${entry.year}`;
              return (
                <div key={entry.id} className="group flex items-center justify-between p-6 hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="h-4 w-4 text-primary opacity-40" />
                      <h3 className="text-lg font-bold text-foreground">{label}</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Total</span>
                        <span className="text-sm font-bold text-primary">{entry.total}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Ethio</span>
                        <span className="text-sm font-bold text-foreground/80">{entry.ethio}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Safaricom</span>
                        <span className="text-sm font-bold text-foreground/80">{entry.safaricom}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block">Processed</span>
                        <span className="text-sm font-bold text-foreground/80">{entry.processed || 0}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block">Rejected</span>
                        <span className="text-sm font-bold text-foreground/80">{entry.rejected || 0}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                    onClick={() => handleDelete(entry.id, label)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {!isLoading && history.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/5">
                <Database className="h-12 w-12 mb-4 opacity-10" />
                <p className="text-sm font-medium">Historical database is empty</p>
                <p className="text-xs">Select "Archive Monthly Data" to begin digitizing records.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <p className="text-[10px] text-amber-600/80 font-medium uppercase tracking-widest">
          Archived data is locked for auditing. Contact headquarters for corrections to processed records.
        </p>
      </div>
    </div>
  );
}
