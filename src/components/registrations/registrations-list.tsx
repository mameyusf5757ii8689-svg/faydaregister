"use client"

import { useState, useMemo, useEffect } from 'react';
import { Registration, RegistrationStatus, UserProfile } from '@/lib/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Trash2,
  FileDigit,
  Eye,
  Calendar,
  User,
  Phone,
  MapPin,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  RefreshCcw,
  X,
  Target,
  Zap,
  Activity
} from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { RegistrationFormModal } from './registration-form-modal';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { logAuditAction } from '@/lib/audit';
import { cn } from '@/lib/utils';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RegistrationsListProps {
  initialRegistrations: Registration[];
}

type SortKey = keyof Registration;
type SortDirection = 'asc' | 'desc';

export function RegistrationsList({ initialRegistrations }: RegistrationsListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({
    key: 'submissionDate',
    direction: 'desc'
  });
  
  // Selection & Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isConfirmBulkDeleteDialogOpen, setIsConfirmBulkDeleteDialogOpen] = useState(false);
  
  const itemsPerPage = 10;
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<{id: string, name: string} | null>(null);
  const [viewingRegistration, setViewingRegistration] = useState<Registration | null>(null);

  const filteredRegistrations = useMemo(() => {
    return initialRegistrations.filter(reg => {
      const matchesSearch = 
        reg.applicantName.toLowerCase().includes(search.toLowerCase()) ||
        reg.id.toLowerCase().includes(search.toLowerCase()) ||
        reg.phone.includes(search);
      
      const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
      
      let matchesDate = true;
      if (startDate || endDate) {
        try {
          const regDate = new Date(reg.submissionDate);
          const start = startDate ? startOfDay(new Date(startDate)) : new Date(0);
          const end = endDate ? endOfDay(new Date(endDate)) : new Date(8640000000000000);
          matchesDate = isWithinInterval(regDate, { start, end });
        } catch {
          matchesDate = true;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [initialRegistrations, search, statusFilter, startDate, endDate]);

  const pulseStats = useMemo(() => {
    return {
      total: filteredRegistrations.length,
      processed: filteredRegistrations.filter(r => r.status === 'Processed').length,
      active: filteredRegistrations.filter(r => r.status === 'Pending Review' || r.status === 'Processing').length,
    };
  }, [filteredRegistrations]);

  const sortedRegistrations = useMemo(() => {
    if (!sortConfig) return filteredRegistrations;

    const sorted = [...filteredRegistrations].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredRegistrations, sortConfig]);

  const totalPages = Math.ceil(sortedRegistrations.length / itemsPerPage);
  const currentItems = sortedRegistrations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const allOnPageSelected = currentItems.length > 0 && currentItems.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      currentItems.forEach(r => next.delete(r.id));
    } else {
      currentItems.forEach(r => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkStatusUpdate = async (newStatus: RegistrationStatus) => {
    if (!db || selectedIds.size === 0 || !user || !profile) return;
    
    setIsBulkProcessing(true);
    const batch = writeBatch(db);
    const count = selectedIds.size;
    const updatedAt = new Date().toISOString();

    selectedIds.forEach(id => {
      batch.update(doc(db, 'registrations', id), {
        status: newStatus,
        updatedAt
      });
    });

    try {
      await batch.commit();
      
      logAuditAction(
        db,
        user,
        profile.fullName,
        'STATUS_UPDATE',
        'bulk_operation',
        `Bulk Registry Action: Updated ${count} records to ${newStatus}.`
      );

      toast({
        title: "Bulk Triage Complete",
        description: `Successfully synchronized ${count} records to ${newStatus}.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Bulk Update Failed",
        description: "Protocol error during mass status synchronization.",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!db || selectedIds.size === 0 || !user || !profile) return;
    
    setIsBulkProcessing(true);
    const batch = writeBatch(db);
    const count = selectedIds.size;

    selectedIds.forEach(id => {
      batch.delete(doc(db, 'registrations', id));
    });

    try {
      await batch.commit();
      
      logAuditAction(
        db,
        user,
        profile.fullName,
        'RECORD_DELETED',
        'bulk_operation',
        `Bulk Registry Purge: Permanently removed ${count} records.`
      );

      toast({
        title: "Registry Purged",
        description: `Successfully removed ${count} records from the active ledger.`,
        variant: "destructive"
      });
      setSelectedIds(new Set());
      setIsConfirmBulkDeleteDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Purge Failed",
        description: "Clearance error during mass record deletion.",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-30 group-hover:opacity-70 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-3.5 w-3.5 text-primary" /> : <ArrowDown className="ml-2 h-3.5 w-3.5 text-primary" />;
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setSortConfig({ key: 'submissionDate', direction: 'desc' });
  };

  const confirmDelete = async () => {
    if (!db || !registrationToDelete) return;
    
    setIsDeleting(true);
    try {
      deleteDocumentNonBlocking(doc(db, 'registrations', registrationToDelete.id));
      toast({
        title: "Record Purged",
        description: `Successfully removed ${registrationToDelete.name} from the bureau registry.`,
        variant: "destructive"
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Purge Failed",
        description: "An error occurred while removing the record.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setRegistrationToDelete(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredRegistrations.length === 0) {
      toast({ title: "Export Failed", description: "No data available to export.", variant: "destructive" });
      return;
    }
    const exportData = filteredRegistrations.map(reg => ({
      'Registration ID': reg.id,
      'Applicant Name': reg.applicantName,
      'Submission Date': reg.submissionDate ? format(new Date(reg.submissionDate), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Status': reg.status,
      'Phone': reg.phone,
      'Location': reg.location,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `Bureau_Registrations_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast({ title: "Excel Export Complete", description: "All registry data has been downloaded." });
  };

  const handleExportPDF = () => {
    if (filteredRegistrations.length === 0) {
      toast({ title: "Export Failed", description: "No data available to export.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text("Registration Bureau Official Ledger", 14, 15);
    const tableRows = filteredRegistrations.map(reg => [reg.id, reg.applicantName, format(new Date(reg.submissionDate), 'yyyy-MM-dd'), reg.phone, reg.status, reg.location]);
    autoTable(doc, {
      startY: 35,
      head: [['Reg ID', 'Applicant Name', 'Date', 'Phone', 'Status', 'Location']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`Bureau_Registrations_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast({ title: "PDF Export Complete", description: "Official ledger document has been generated." });
  };

  return (
    <div className="space-y-6">
      {/* Registry Pulse Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PulseCard label="Total Intake" value={pulseStats.total} icon={Target} color="text-primary" />
        <PulseCard label="Finalized Records" value={pulseStats.processed} icon={ShieldCheck} color="text-emerald-500" />
        <PulseCard label="Awaiting Review" value={pulseStats.active} icon={RefreshCcw} color="text-amber-500" />
      </div>

      <Card className="p-4 sm:p-6 bg-card shadow-sm border-none rounded-2xl overflow-hidden relative">
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground font-headline">Registration Ledger</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Forensic Scan: {filteredRegistrations.length} Matching Documents</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button onClick={handleExportExcel} variant="outline" className="flex-1 sm:flex-none border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 font-black text-[10px] uppercase tracking-widest h-11 bg-background">
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button onClick={handleExportPDF} variant="outline" className="flex-1 sm:flex-none border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-black text-[10px] uppercase tracking-widest h-11 bg-background">
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </Button>
              </div>
              <div className="relative w-full lg:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="ID, Name, or Phone..." 
                  className="pl-10 h-11 bg-background border-border rounded-xl text-xs font-bold w-full"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-muted/20 rounded-2xl border border-dashed border-border">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <Filter className="h-3 w-3" /> Status Gate
              </label>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 bg-background border-border rounded-xl text-[10px] font-bold uppercase">
                  <SelectValue placeholder="All Records" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Statuses</SelectItem>
                  <SelectItem value="Processed" className="text-[10px] font-bold uppercase">Processed</SelectItem>
                  <SelectItem value="Processing" className="text-[10px] font-bold uppercase">Processing</SelectItem>
                  <SelectItem value="Pending Review" className="text-[10px] font-bold uppercase">Pending Review</SelectItem>
                  <SelectItem value="Rejected" className="text-[10px] font-bold uppercase">Rejected</SelectItem>
                  <SelectItem value="Failed" className="text-[10px] font-bold uppercase">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <Calendar className="h-3 w-3" /> From Date
              </label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="h-10 bg-background border-border rounded-xl text-[10px] font-bold uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <Calendar className="h-3 w-3" /> To Date
              </label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="h-10 bg-background border-border rounded-xl text-[10px] font-bold uppercase"
              />
            </div>
            
            <div className="flex items-end">
              <Button variant="ghost" className="h-10 w-full font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground" onClick={resetFilters}>
                Reset Matrix
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden shadow-sm relative min-h-[400px]">
            {/* Bulk Command Matrix Overlay - Responsive Refinement */}
            {selectedIds.size > 0 && (
              <div className="absolute top-0 left-0 right-0 z-30 min-h-[3.5rem] h-auto bg-primary text-primary-foreground flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 py-3 sm:py-0 gap-4 sm:gap-6 animate-in slide-in-from-top duration-500 shadow-xl">
                <p className="text-[11px] font-black uppercase tracking-widest flex-1">
                   {selectedIds.size} Units Selected
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-tighter hover:bg-white/10" onClick={() => setSelectedIds(new Set())}>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Clear
                  </Button>
                  <div className="hidden sm:block w-px h-5 bg-white/20" />
                  <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-tighter hover:bg-white/10" onClick={() => handleBulkStatusUpdate('Processed')} disabled={isBulkProcessing}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Processed
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-tighter hover:bg-white/10" onClick={() => handleBulkStatusUpdate('Processing')} disabled={isBulkProcessing}>
                    <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Active
                  </Button>
                  <div className="hidden sm:block w-px h-5 bg-white/20" />
                  <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-tighter hover:bg-red-500 text-white" onClick={() => setIsConfirmBulkDeleteDialogOpen(true)} disabled={isBulkProcessing}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Purge
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent h-14 border-border">
                    <TableHead className="w-12 pl-6">
                      <Checkbox 
                        checked={allOnPageSelected} 
                        onCheckedChange={toggleSelectAll}
                        className="border-muted-foreground/30"
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground whitespace-nowrap" onClick={() => requestSort('id')}>
                      <div className="flex items-center">Registration ID {getSortIcon('id')}</div>
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground whitespace-nowrap" onClick={() => requestSort('applicantName')}>
                      <div className="flex items-center">Applicant Name {getSortIcon('applicantName')}</div>
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground text-center whitespace-nowrap" onClick={() => requestSort('submissionDate')}>
                      <div className="flex items-center justify-center">Date {getSortIcon('submissionDate')}</div>
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground text-center whitespace-nowrap hidden sm:table-cell" onClick={() => requestSort('phone')}>
                      <div className="flex items-center justify-center">Phone {getSortIcon('phone')}</div>
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground text-center whitespace-nowrap" onClick={() => requestSort('status')}>
                      <div className="flex items-center justify-center">Status {getSortIcon('status')}</div>
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-8 text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((reg) => (
                      <TableRow key={reg.id} className={cn(
                        "hover:bg-muted/20 transition-colors border-border group h-20",
                        selectedIds.has(reg.id) && "bg-primary/[0.03]"
                      )}>
                        <TableCell className="pl-6">
                          <Checkbox 
                            checked={selectedIds.has(reg.id)} 
                            onCheckedChange={() => toggleSelectRow(reg.id)}
                            className="border-muted-foreground/30"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground/20 whitespace-nowrap">
                            <FileDigit className="h-3 w-3" />
                            {reg.id.substring(0, 15)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-black text-foreground tracking-tight whitespace-nowrap">{reg.applicantName}</p>
                          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">{reg.location.split(',')[0]}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">{reg.submissionDate ? format(new Date(reg.submissionDate), 'MMM dd, yyyy') : 'N/A'}</p>
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <p className="text-xs font-bold text-muted-foreground tabular-nums">{reg.phone}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={reg.status} className="scale-75 sm:scale-90" />
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl" onClick={() => setViewingRegistration(reg)}>
                              <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                            </Button>
                            <RegistrationFormModal registration={reg} mode="edit" trigger={
                              <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl">Edit</Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/5 rounded-xl hidden sm:flex" onClick={() => { setRegistrationToDelete({id: reg.id, name: reg.applicantName}); setIsDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-80 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 opacity-20">
                          <Activity className="h-16 w-16 text-muted-foreground" />
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Registry Scan Complete: Zero Matches</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-border">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest order-2 sm:order-1 text-center sm:text-left">
              Visualizing Range: {Math.min((currentPage - 1) * itemsPerPage + 1, sortedRegistrations.length)} to {Math.min(currentPage * itemsPerPage, sortedRegistrations.length)}
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-xl border-border bg-background hover:bg-muted"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center justify-center min-w-[100px] sm:min-w-[120px] h-10 text-[10px] font-black text-foreground bg-muted/50 border border-border rounded-xl uppercase tracking-widest px-4">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-xl border-border bg-background hover:bg-muted"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Forensic Detail Dialog */}
      <Dialog open={!!viewingRegistration} onOpenChange={(open) => !open && setViewingRegistration(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[650px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-popover max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 sm:p-8 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl hidden sm:block">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                   <DialogTitle className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tighter leading-none mb-1">Documentation Archive</DialogTitle>
                   <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Authorized Bureau Record</DialogDescription>
                </div>
              </div>
              <StatusBadge status={viewingRegistration?.status || 'Pending Review'} />
            </div>
          </DialogHeader>

          <div className="p-6 sm:p-8 space-y-8 sm:space-y-10 bg-card relative overflow-hidden">
            {viewingRegistration?.status === 'Rejected' && viewingRegistration.rejectionReason && (
              <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Protocol Rejection</p>
                </div>
                <p className="text-sm font-bold text-rose-700 leading-tight">Detail: {viewingRegistration.rejectionReason}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 relative z-10">
              <DetailItem label="Applicant Identity" value={viewingRegistration?.applicantName} icon={User} />
              <DetailItem label="Inbound Date" value={viewingRegistration?.submissionDate ? format(new Date(viewingRegistration.submissionDate), 'MMMM dd, yyyy') : 'N/A'} icon={Calendar} />
              <DetailItem label="Communication Hub" value={viewingRegistration?.phone} icon={Phone} />
              <DetailItem label="Processing Sector" value={viewingRegistration?.location} icon={MapPin} />
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <RefreshCcw className="h-3 w-3" /> Audit Log & Remarks
                </p>
                <div className="p-5 sm:p-6 bg-muted/40 rounded-[24px] sm:rounded-[28px] border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed italic font-medium">
                    "{viewingRegistration?.remarks || "No internal annotations detected."}"
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-primary/[0.02] border border-primary/5 rounded-2xl gap-4">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Full Protocol ID</p>
                    <p className="text-[10px] sm:text-[11px] font-mono font-bold text-primary break-all">{viewingRegistration?.id}</p>
                 </div>
                 <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center opacity-40 shrink-0 self-end sm:self-auto">
                    <FileDigit className="h-5 w-5" />
                 </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
            <Button onClick={() => setViewingRegistration(null)} className="w-full sm:w-auto h-11 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest">
              Close Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Purge Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-md p-0 overflow-hidden mx-4">
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto bg-destructive/10 p-5 rounded-2xl w-fit">
              {isDeleting ? <Loader2 className="h-10 w-10 text-destructive animate-spin" /> : <Trash2 className="h-10 w-10 text-destructive" />}
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                {isDeleting ? "PURGING RECORD..." : "PERMANENT DELETION"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed font-medium">
                {isDeleting 
                  ? `Removing registry documentation for ${registrationToDelete?.name}. Please wait...`
                  : `You are about to permanently purge the record for ${registrationToDelete?.name} from the bureau registry. This action is final and subject to administrative audit.`
                }
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-row gap-3">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); confirmDelete(); }} 
              disabled={isDeleting}
              className="w-full h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/10 transition-all active:scale-[0.98]"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Destruction"}
            </AlertDialogAction>
            {!isDeleting && (
              <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-none bg-transparent hover:bg-card">
                Abort Protocol
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Purge Confirmation */}
      <AlertDialog open={isConfirmBulkDeleteDialogOpen} onOpenChange={setIsConfirmBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-md p-0 overflow-hidden mx-4">
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto bg-destructive/10 p-5 rounded-2xl w-fit">
              {isBulkProcessing ? <Loader2 className="h-10 w-10 text-destructive animate-spin" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                {isBulkProcessing ? "PURGING REGISTRY..." : "MASS DELETION PROTOCOL"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed font-medium">
                {isBulkProcessing 
                  ? "Executing bulk record destruction. Synchronizing with forensic ledger..."
                  : `You are about to permanently purge ${selectedIds.size} records from the bureau hub. This operation cannot be reversed.`
                }
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-row gap-3">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }} 
              disabled={isBulkProcessing}
              className="w-full h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/10 active:scale-[0.98] transition-all"
            >
              {isBulkProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Destruction"}
            </AlertDialogAction>
            {!isBulkProcessing && (
              <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-none bg-transparent hover:bg-card">
                Abort Mass Action
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PulseCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden group">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">{value.toLocaleString()}</p>
        </div>
        <div className={cn("p-2.5 sm:p-3 rounded-xl bg-muted/50 border border-border group-hover:bg-background transition-all", color)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value, icon: Icon }: any) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
        <Icon className="h-3 w-3 text-primary/40" /> {label}
      </p>
      <p className="text-sm font-black text-foreground leading-none">{value || '-'}</p>
    </div>
  );
}