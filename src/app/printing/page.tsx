'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Printer, 
  CheckCircle2, 
  Search, 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  Filter,
  FileDigit,
  User,
  Clock,
  History,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { format, isSameMonth } from 'date-fns';
import { Registration } from '@/lib/types';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PrintingPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrinted, setFilterPrinted] = useState<'all' | 'pending' | 'printed'>('pending');
  const [periodFilter, setPeriodFilter] = useState<'current' | 'all'>('current');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Data Isolation: Only this officer's records
    return query(
      collection(db, 'registrations'),
      where('assignedReviewerId', '==', user.uid),
      limit(2000)
    );
  }, [db, user]);

  const { data: registrations, isLoading } = useCollection<Registration>(registrationsQuery);

  const filteredItems = useMemo(() => {
    if (!registrations) return [];
    
    const now = new Date();
    
    return registrations.filter(reg => {
      // 1. STRCT REQUIREMENT: Only show Processed records for printing
      if (reg.status !== 'Processed') return false;

      // 2. Period Filter (This month vs All months)
      if (periodFilter === 'current') {
        const regDate = new Date(reg.submissionDate);
        if (!isSameMonth(regDate, now)) return false;
      }

      // 3. Search Filter
      const matchesSearch = 
        reg.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.id.includes(searchTerm);
      if (!matchesSearch) return false;

      // 4. Printing Status Filter
      if (filterPrinted === 'pending' && reg.isPrinted) return false;
      if (filterPrinted === 'printed' && !reg.isPrinted) return false;

      return true;
    }).sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [registrations, searchTerm, filterPrinted, periodFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPrinted, periodFilter]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleMarkPrinted = async (reg: Registration) => {
    if (!db) return;
    
    try {
      await updateDocumentNonBlocking(doc(db, 'registrations', reg.id), {
        isPrinted: true,
        updatedAt: new Date().toISOString(),
        remarks: `${reg.remarks || ''}\n[PRINTING TERMINAL]: Marked as physically printed on ${format(new Date(), 'MMM dd, HH:mm')}`
      });
      
      toast({
        title: "ID Issued",
        description: `Physical ID for ${reg.applicantName} marked as printed.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Protocol Failure",
        description: "Could not synchronize printing status with bureau ledger.",
      });
    }
  };

  if (isUserLoading || isLoading || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Authenticating Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link href="/dashboard" className="flex items-center text-[10px] font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest gap-1.5 mb-2">
            <ArrowLeft className="h-3 w-3" /> Command Center
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
              <Printer className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Printing Terminal</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Processed ID Production & Issuance</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              {periodFilter === 'current' ? <Calendar className="h-5 w-5 text-emerald-500" /> : <History className="h-5 w-5 text-amber-500" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Operational Intake</span>
              <span className="text-sm font-black text-foreground">
                {periodFilter === 'current' ? format(new Date(), 'MMMM yyyy') : 'Full Registry Ledger'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Filter className="h-3 w-3" /> Queue Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Duty Period</label>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant={periodFilter === 'current' ? 'default' : 'outline'} 
                    size="sm" 
                    className="justify-start font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl"
                    onClick={() => setPeriodFilter('current')}
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5" /> Current Month
                  </Button>
                  <Button 
                    variant={periodFilter === 'all' ? 'default' : 'outline'} 
                    size="sm" 
                    className="justify-start font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl"
                    onClick={() => setPeriodFilter('all')}
                  >
                    <LayoutGrid className="mr-2 h-3.5 w-3.5" /> All Records
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Search Registry</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                  <Input 
                    placeholder="Name or RID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-border bg-background rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Issuance Status</label>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant={filterPrinted === 'pending' ? 'default' : 'outline'} 
                    size="sm" 
                    className="justify-start font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl"
                    onClick={() => setFilterPrinted('pending')}
                  >
                    <Clock className="mr-2 h-3.5 w-3.5" /> Pending Printing
                  </Button>
                  <Button 
                    variant={filterPrinted === 'printed' ? 'default' : 'outline'} 
                    size="sm" 
                    className="justify-start font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl"
                    onClick={() => setFilterPrinted('printed')}
                  >
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Already Printed
                  </Button>
                  <Button 
                    variant={filterPrinted === 'all' ? 'default' : 'outline'} 
                    size="sm" 
                    className="justify-start font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl"
                    onClick={() => setFilterPrinted('all')}
                  >
                    <Filter className="mr-2 h-3.5 w-3.5" /> All Status
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed border-border">
                <div className="p-4 bg-primary/[0.03] border border-primary/10 rounded-xl space-y-1">
                   <p className="text-[9px] font-bold text-muted-foreground uppercase">Items in View</p>
                   <p className="text-2xl font-black text-foreground">{filteredItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-3xl">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pl-8 text-muted-foreground">Registry ID</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground">Applicant Name</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground text-center">Status</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground text-center">Production</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pr-8 text-right text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length > 0 ? paginatedItems.map((reg) => (
                  <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors border-border h-20">
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground/30 uppercase">
                        <FileDigit className="h-3 w-3" />
                        {reg.id.substring(0, 15)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border border-border">
                          <User className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-foreground tracking-tight">{reg.applicantName}</span>
                          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                            Inbound: {format(new Date(reg.submissionDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={reg.status} className="scale-75 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      {reg.isPrinted ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Printed</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20">
                          <Clock className="h-3 w-3" />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Pending</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      {!reg.isPrinted ? (
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest rounded-xl h-9 px-4 shadow-lg shadow-primary/10"
                          onClick={() => handleMarkPrinted(reg)}
                        >
                          <Printer className="mr-2 h-3.5 w-3.5" /> Printed
                        </Button>
                      ) : (
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase italic">Issuance Complete</span>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-60 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 opacity-20">
                        <Printer className="h-12 w-12 text-muted-foreground" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No processed records found for current queue</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-card border border-border rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Showing {paginatedItems.length} of {filteredItems.length} Processed Items
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl border-border bg-background hover:bg-muted"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center min-w-[80px] h-9 text-[10px] font-black text-foreground bg-muted/50 border border-border rounded-xl uppercase tracking-widest px-3">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl border-border bg-background hover:bg-muted"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
