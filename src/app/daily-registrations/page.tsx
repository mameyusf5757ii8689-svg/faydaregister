"use client"

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  CalendarPlus, 
  History, 
  CheckCircle2, 
  Smartphone, 
  Phone,
  Pencil,
  Trash2,
  X,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { 
  addDocumentNonBlocking, 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase/non-blocking-updates';
import { DailyReport } from '@/lib/types';
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

const dailyReportSchema = z.object({
  date: z.string().min(1, "Date is required"),
  ethioCount: z.coerce.number().min(0, "Cannot be negative"),
  safaricomCount: z.coerce.number().min(0, "Cannot be negative"),
  remarks: z.string().optional(),
});

type DailyReportValues = z.infer<typeof dailyReportSchema>;

export default function DailyRegistrationsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Deletion state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<{id: string, date: string} | null>(null);

  // Fetch only this officer's reports
  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'daily_reports'),
      where('officerId', '==', user.uid)
    );
  }, [db, user]);

  const { data: rawHistory, isLoading } = useCollection<DailyReport>(reportsQuery);

  // Client-side sorting by date (descending)
  const history = useMemo(() => {
    if (!rawHistory) return [];
    return [...rawHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawHistory]);

  const form = useForm<DailyReportValues>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      ethioCount: 0,
      safaricomCount: 0,
      remarks: '',
    },
  });

  const ethioCount = Number(form.watch('ethioCount')) || 0;
  const safaricomCount = Number(form.watch('safaricomCount')) || 0;
  const dailyTotal = ethioCount + safaricomCount;

  async function onSubmit(values: DailyReportValues) {
    if (!db || !user) return;

    const reportData = {
      ...values,
      officerId: user.uid,
      total: dailyTotal,
      timestamp: serverTimestamp(),
    };

    if (editingId) {
      await setDocumentNonBlocking(doc(db, 'daily_reports', editingId), reportData, { merge: true });
      toast({
        title: "Report Updated",
        description: `Daily registration for ${format(new Date(values.date), 'MMM dd')} updated successfully.`,
      });
      setEditingId(null);
    } else {
      await addDocumentNonBlocking(collection(db, 'daily_reports'), reportData);
      toast({
        title: "Report Submitted",
        description: `Daily registration for ${format(new Date(values.date), 'MMM dd')} saved successfully.`,
      });
    }

    form.reset({
      date: new Date().toISOString().split('T')[0],
      ethioCount: 0,
      safaricomCount: 0,
      remarks: '',
    });
  }

  const handleEdit = (entry: DailyReport) => {
    setEditingId(entry.id);
    form.reset({
      date: entry.date,
      ethioCount: entry.ethioCount,
      safaricomCount: entry.safaricomCount,
      remarks: entry.remarks || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!db || !reportToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDocumentNonBlocking(doc(db, 'daily_reports', reportToDelete.id));
      
      if (editingId === reportToDelete.id) {
        setEditingId(null);
        form.reset({
          date: new Date().toISOString().split('T')[0],
          ethioCount: 0,
          safaricomCount: 0,
          remarks: '',
        });
      }

      toast({
        title: "Report Removed",
        description: `The registration report for ${format(new Date(reportToDelete.date), 'MMMM dd')} has been deleted.`,
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Purge Failed",
        description: "An error occurred during report deletion.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    form.reset({
      date: new Date().toISOString().split('T')[0],
      ethioCount: 0,
      safaricomCount: 0,
      remarks: '',
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Field Operations</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Registration Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Submit or modify your daily total counts for verification and performance tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1">
          <Card className={cn(
            "border-none shadow-sm sticky top-24 transition-all duration-300 bg-card",
            editingId && "ring-1 ring-primary/20 bg-primary/5"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5 text-primary" />
                  {editingId ? "Update Entry" : "Report Today's Total"}
                </CardTitle>
                {editingId && (
                  <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardDescription>
                {editingId ? "Currently modifying an existing record." : "Enter your successful registrations for the date."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-11 bg-background border-border" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ethioCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-emerald-500" /> Ethio
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              className="h-11 bg-background border-border" 
                              onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="safaricomCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                            <Smartphone className="h-3 w-3 text-orange-500" /> Safaricom
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              className="h-11 bg-background border-border" 
                              onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-border text-center transition-all">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Calculated Aggregate</p>
                    <p className="text-4xl font-black text-foreground">{dailyTotal}</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Internal Remarks</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g. Issues with network, branch updates..." 
                            className="resize-none min-h-[80px] bg-background border-border" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col gap-2">
                    <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold shadow-md">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> 
                      {editingId ? "Update Registration Record" : "Finalize Registration Report"}
                    </Button>
                    {editingId && (
                      <Button type="button" variant="outline" onClick={cancelEdit} className="w-full h-11 font-bold border-border">
                        Cancel Update
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Report Ledger
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" /></div>
            ) : history.map((entry) => (
              <Card key={entry.id} className={cn(
                "border-none shadow-sm overflow-hidden group transition-all bg-card",
                editingId === entry.id ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"
              )}>
                <CardContent className="p-5 flex items-center gap-6">
                  <div className="flex flex-col items-center justify-center min-w-[80px] py-2.5 px-4 bg-muted/50 rounded-xl border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(entry.date), 'MMM')}</span>
                    <span className="text-2xl font-black text-foreground">{format(new Date(entry.date), 'dd')}</span>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ethio</p>
                      <p className="text-lg font-bold text-foreground/80">{entry.ethioCount}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Safaricom</p>
                      <p className="text-lg font-bold text-foreground/80">{entry.safaricomCount}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
                      <p className="text-xl font-black text-primary">{entry.total}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                      onClick={() => handleEdit(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => {
                        setReportToDelete({id: entry.id, date: entry.date});
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!isLoading && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 bg-card rounded-2xl border border-dashed border-border text-muted-foreground/30">
                <CalendarPlus className="h-16 w-16 mb-4 opacity-10" />
                <p className="text-lg font-bold">No reports logged yet</p>
                <p className="text-sm">Submit your first registration report to begin tracking.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-popover border-border rounded-3xl overflow-hidden p-0">
          <div className="p-8 text-center space-y-4">
             <div className="mx-auto bg-destructive/10 p-4 rounded-2xl w-fit">
              {isDeleting ? <Loader2 className="h-8 w-8 text-destructive animate-spin" /> : <Trash2 className="h-8 w-8 text-destructive" />}
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground text-center font-black uppercase tracking-tight">
                {isDeleting ? "PURGING REPORT..." : "ARE YOU SURE?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-center">
                {isDeleting 
                  ? "Updating operational ledger. Please wait..."
                  : `This will permanently delete the report for ${reportToDelete && format(new Date(reportToDelete.date), 'MMMM dd, yyyy')}.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-col gap-2">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); confirmDelete(); }} 
              disabled={isDeleting}
              className="w-full h-12 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Purge Report"}
            </AlertDialogAction>
            {!isDeleting && (
              <AlertDialogCancel 
                onClick={() => setReportToDelete(null)} 
                className="w-full h-10 border-none bg-transparent font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
