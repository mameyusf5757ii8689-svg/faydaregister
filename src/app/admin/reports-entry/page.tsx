
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useMemoFirebase, useFirestore, useUser } from '@/firebase';
import { collection, query, limit, doc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ClipboardEdit, History, Loader2, Save, CheckCircle2 } from 'lucide-react';

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 6 }, (_, i) => (new Date().getFullYear() - 2 + i).toString()).reverse();

export default function AdminReportsEntryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  // Daily Report Proxy State
  const [dailyOfficerId, setDailyOfficerId] = useState('');
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyEthio, setDailyEthio] = useState('0');
  const [dailySafaricom, setDailySafaricom] = useState('0');
  const [dailyRemarks, setDailyRemarks] = useState('');

  // Historical Proxy State
  const [histOfficerId, setHistOfficerId] = useState('');
  const [histMonth, setHistMonth] = useState(MONTHS[new Date().getMonth()]);
  const [histYear, setHistYear] = useState(new Date().getFullYear().toString());
  const [histEthio, setHistEthio] = useState('0');
  const [histSafaricom, setHistSafaricom] = useState('0');
  const [histProcessed, setHistProcessed] = useState('0');
  const [histRejected, setHistRejected] = useState('0');

  const officersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db, user]);

  const { data: officers, isLoading: isOfficersLoading } = useCollection<UserProfile>(officersQuery);

  const handleDailySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyOfficerId || !db) return;

    const ethio = parseInt(dailyEthio) || 0;
    const safaricom = parseInt(dailySafaricom) || 0;

    const reportData = {
      officerId: dailyOfficerId,
      date: dailyDate,
      ethioCount: ethio,
      safaricomCount: safaricom,
      total: ethio + safaricom,
      remarks: `ADMIN PROXY: ${dailyRemarks}`,
      timestamp: serverTimestamp(),
    };

    addDocumentNonBlocking(collection(db, 'daily_reports'), reportData);

    toast({
      title: "Proxy Report Logged",
      description: `Daily counts successfully archived.`,
    });
    
    setDailyEthio('0');
    setDailySafaricom('0');
    setDailyRemarks('');
  };

  const handleHistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!histOfficerId || !db) return;

    const ethio = parseInt(histEthio) || 0;
    const safaricom = parseInt(histSafaricom) || 0;

    const summaryData = {
      officerId: histOfficerId,
      month: histMonth,
      year: histYear,
      ethio,
      safaricom,
      total: ethio + safaricom,
      processed: parseInt(histProcessed) || 0,
      rejected: parseInt(histRejected) || 0,
      timestamp: serverTimestamp(),
    };

    const summaryId = `${histOfficerId}_${histMonth}_${histYear}`;
    setDocumentNonBlocking(doc(db, 'monthly_summaries', summaryId), summaryData, { merge: true });

    toast({
      title: "Monthly Data Archived",
      description: `Summary for ${histMonth} ${histYear} recorded.`,
    });
  };

  if (isOfficersLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bureau Administration</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Proxy Ledger Entry</h1>
        <p className="text-sm text-muted-foreground">Log reports or archive historical data on behalf of field officers.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ClipboardEdit className="h-5 w-5 text-primary" />
              Manual Daily Log
            </CardTitle>
            <CardDescription>Enter counts for a specific officer's daily activity.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleDailySubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Select Officer</Label>
                <Select value={dailyOfficerId} onValueChange={setDailyOfficerId}>
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder="Select official..." />
                  </SelectTrigger>
                  <SelectContent>
                    {officers?.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.fullName} ({o.region})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Reporting Date</Label>
                  <Input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className="h-11 bg-background border-border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Ethio</Label>
                    <Input type="number" value={dailyEthio} onChange={e => setDailyEthio(e.target.value)} className="h-11 bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Safaricom</Label>
                    <Input type="number" value={dailySafaricom} onChange={e => setDailySafaricom(e.target.value)} className="h-11 bg-background border-border" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl border border-dashed border-border text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Calculated Aggregate</p>
                <p className="text-3xl font-black text-foreground">
                  {(parseInt(dailyEthio) || 0) + (parseInt(dailySafaricom) || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Notes (Admin)</Label>
                <Textarea value={dailyRemarks} onChange={e => setDailyRemarks(e.target.value)} placeholder="Reason for proxy entry..." className="resize-none min-h-[100px] bg-background border-border" />
              </div>

              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold">
                <Save className="mr-2 h-4 w-4" /> Commit Proxy Report
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-amber-500" />
              Monthly Data Archival
            </CardTitle>
            <CardDescription>Digitize aggregate monthly totals for historical tracking.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleHistSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Officer Profile</Label>
                <Select value={histOfficerId} onValueChange={setHistOfficerId}>
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder="Select official..." />
                  </SelectTrigger>
                  <SelectContent>
                    {officers?.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Reporting Period</Label>
                  <div className="flex gap-2">
                    <Select value={histMonth} onValueChange={setHistMonth}>
                      <SelectTrigger className="h-11 bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={histYear} onValueChange={setHistYear}>
                      <SelectTrigger className="h-11 bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Historical Total</Label>
                  <div className="h-11 flex items-center justify-center bg-amber-500/10 rounded-lg border border-amber-500/20 text-xl font-black text-amber-500">
                    {(parseInt(histEthio) || 0) + (parseInt(histSafaricom) || 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase">Ethio</Label>
                  <Input type="number" value={histEthio} onChange={e => setHistEthio(e.target.value)} className="h-10 bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase">Safaricom</Label>
                  <Input type="number" value={histSafaricom} onChange={e => setHistSafaricom(e.target.value)} className="h-10 bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase">Processed</Label>
                  <Input type="number" value={histProcessed} onChange={e => setHistProcessed(e.target.value)} className="h-10 bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase">Rejected</Label>
                  <Input type="number" value={histRejected} onChange={e => setHistRejected(e.target.value)} className="h-10 bg-background border-border" />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700 font-bold text-white shadow-md">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalize Archive Record
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
