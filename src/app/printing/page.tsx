'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, limit, writeBatch } from 'firebase/firestore';
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
  ChevronRight,
  X,
  ShieldAlert,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { format, isSameMonth } from 'date-fns';
import { Registration, UserProfile } from '@/lib/types';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { logAuditAction } from '@/lib/audit';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PrintingPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrinted, setFilterPrinted] = useState<'all' | 'pending' | 'printed'>('pending');
  const [periodFilter, setPeriodFilter] = useState<'current' | 'all'>('current');
  const [isExporting, setIsExporting] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'registrations'),
      where('assignedReviewerId', '==', user.uid),
      limit(10000)
    );
  }, [db, user]);

  const { data: registrations, isLoading } = useCollection<Registration>(registrationsQuery);

  const filteredItems = useMemo(() => {
    if (!registrations) return [];
    
    const now = new Date();
    
    return registrations.filter(reg => {
      if (reg.status !== 'Processed') return false;

      if (periodFilter === 'current') {
        const regDate = new Date(reg.submissionDate);
        if (!isSameMonth(regDate, now)) return false;
      }

      const matchesSearch = 
        reg.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.id.includes(searchTerm);
      if (!matchesSearch) return false;

      if (filterPrinted === 'pending' && reg.isPrinted) return false;
      if (filterPrinted === 'printed' && !reg.isPrinted) return false;

      return true;
    }).sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [registrations, searchTerm, filterPrinted, periodFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, filterPrinted, periodFilter]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const allOnPageSelected = paginatedItems.length > 0 && paginatedItems.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      paginatedItems.forEach(r => next.delete(r.id));
    } else {
      paginatedItems.forEach(r => {
        if (!r.isPrinted) next.add(r.id);
      });
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkMarkPrinted = async () => {
    if (!db || selectedIds.size === 0 || !user || !profile) return;
    
    setIsBulkProcessing(true);
    const batch = writeBatch(db);
    const count = selectedIds.size;
    const nowTs = format(new Date(), 'MMM dd, HH:mm');

    selectedIds.forEach(id => {
      const reg = filteredItems.find(r => r.id === id);
      batch.update(doc(db, 'registrations', id), {
        isPrinted: true,
        updatedAt: new Date().toISOString(),
        remarks: `${reg?.remarks || ''}\n[PRINTING TERMINAL]: Bulk marked as physically printed on ${nowTs}`
      });
    });

    try {
      await batch.commit();
      
      logAuditAction(
        db,
        user,
        profile.fullName,
        'STATUS_UPDATE',
        'bulk_printing',
        `Bulk Printing: Marked ${count} processed records as physically issued.`
      );

      toast({
        title: "Bulk Issuance Complete",
        description: `Successfully marked ${count} IDs as printed.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Bulk Operation Failed",
        description: "Protocol error during mass printing synchronization.",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleMarkPrinted = async (reg: Registration) => {
    if (!db || !user || !profile) return;
    
    try {
      await updateDocumentNonBlocking(doc(db, 'registrations', reg.id), {
        isPrinted: true,
        updatedAt: new Date().toISOString(),
        remarks: `${reg.remarks || ''}\n[PRINTING TERMINAL]: Marked as physically printed on ${format(new Date(), 'MMM dd, HH:mm')}`
      });

      logAuditAction(
        db,
        user,
        profile.fullName,
        'STATUS_UPDATE',
        reg.id,
        `Printing Terminal: Marked ID for ${reg.applicantName} as physically issued.`
      );
      
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

  const handleExportExcel = () => {
    if (filteredItems.length === 0 || !profile) return;
    setIsExporting(true);
    
    const exportData = filteredItems.map(r => ({
      'Registry ID': r.id,
      'Applicant': r.applicantName,
      'Inbound Date': format(new Date(r.submissionDate), 'yyyy-MM-dd'),
      'Phone': r.phone,
      'Location': r.location,
      'Issuance Status': r.isPrinted ? 'PRINTED' : 'PENDING'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production_Queue");
    XLSX.writeFile(wb, `Bureau_Production_Queue_${format(new Date(), 'yyyyMMdd')}.xlsx`);

    logAuditAction(db, user!, profile.fullName, 'PERFORMANCE_REVIEW', 'printing_terminal', `Exported XLSX production report for ${filteredItems.length} IDs.`);
    
    toast({ title: "Excel Queue Generated", description: "Issuance manifest has been downloaded." });
    setTimeout(() => setIsExporting(false), 800);
  };

  const handleExportPDF = () => {
    if (filteredItems.length === 0 || !profile) return;
    setIsExporting(true);

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Official Bureau Production & Issuance Manifest", 14, 15);
    doc.setFontSize(10);
    doc.text(`Issuer: ${profile.fullName} | Queue: ${filteredItems.length} Units | Date: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 22);

    const rows = filteredItems.map(r => [
      r.id.substring(0, 15) + '...',
      r.applicantName,
      format(new Date(r.submissionDate), 'MMM dd, yyyy'),
      r.phone,
      r.location.split(',')[0],
      r.isPrinted ? 'PRINTED' : 'PENDING'
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Registry ID', 'Applicant Name', 'Inbound Date', 'Phone', 'Sector', 'Status']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Bureau_Issuance_Manifest_${format(new Date(), 'yyyyMMdd')}.pdf`);
    
    logAuditAction(db, user!, profile.fullName, 'PERFORMANCE_REVIEW', 'printing_terminal', `Exported PDF production report for ${filteredItems.length} IDs.`);
    
    toast({ title: "PDF Manifest Generated", description: "High-fidelity production document saved." });
    setTimeout(() => setIsExporting(false), 800);
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
        
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-2.5 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-border h-10">
            <Button onClick={handleExportExcel} disabled={isExporting} variant="outline" className="h-8 px-3 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 font-bold text-[9px] uppercase tracking-widest rounded-lg">
               {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} XLS
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="h-8 px-3 border-rose-500/20 text-rose-600 hover:bg-rose-500/5 font-bold text-[9px] uppercase tracking-widest rounded-lg">
               {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} PDF
            </Button>
          </div>
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
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-3xl relative min-h-[500px]">
            {/* Bulk Action Overlay - Hardened Responsiveness */}
            {selectedIds.size > 0 && (
              <div className="absolute top-0 left-0 right-0 z-30 min-h-[3.5rem] h-auto bg-primary text-primary-foreground flex flex-col sm:flex-row items-center px-4 sm:px-8 py-3 sm:py-0 gap-4 sm:gap-6 animate-in slide-in-from-top duration-500 shadow-xl">
                <p className="text-[11px] font-black uppercase tracking-widest flex-1 text-center sm:text-left">
                   {selectedIds.size} Records Selected
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10" onClick={() => setSelectedIds(new Set())}>
                    <X className="mr-2 h-4 w-4" /> Clear
                  </Button>
                  <div className="hidden sm:block w-px h-6 bg-white/20" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 px-6 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 bg-white/10" 
                    onClick={handleBulkMarkPrinted}
                    disabled={isBulkProcessing}
                  >
                    {isBulkProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Mark All as Printed
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-12 pl-6 sm:pl-8">
                      <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} className="border-muted-foreground/30" />
                    </TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground">Registry ID</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground">Applicant Name</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground text-center">Status</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 text-muted-foreground text-center">Production</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pr-8 text-right text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length > 0 ? paginatedItems.map((reg) => (
                    <TableRow key={reg.id} className={cn(
                      "hover:bg-muted/30 transition-colors border-border h-20",
                      selectedIds.has(reg.id) && "bg-primary/5"
                    )}>
                      <TableCell className="pl-6 sm:pl-8">
                        {!reg.isPrinted && (
                          <Checkbox 
                            checked={selectedIds.has(reg.id)} 
                            onCheckedChange={() => toggleSelectRow(reg.id)}
                            className="border-muted-foreground/30 shrink-0"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground/30 uppercase whitespace-nowrap">
                          <FileDigit className="h-3 w-3" />
                          {reg.id.substring(0, 15)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border border-border shrink-0 hidden sm:flex">
                            <User className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-foreground tracking-tight truncate">{reg.applicantName}</span>
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
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest rounded-xl h-9 px-4 shadow-lg shadow-primary/10 transition-all active:scale-95"
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
                      <TableCell colSpan={6} className="h-60 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 opacity-20">
                          <Printer className="h-12 w-12 text-muted-foreground" />
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No processed records found for current queue</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-card border border-border rounded-2xl shadow-sm gap-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest order-2 sm:order-1">
                Showing {paginatedItems.length} of {filteredItems.length} Processed Items
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl border-border bg-background hover:bg-muted"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center min-w-[100px] h-9 text-[10px] font-black text-foreground bg-muted/50 border border-border rounded-xl uppercase tracking-widest px-3">
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
