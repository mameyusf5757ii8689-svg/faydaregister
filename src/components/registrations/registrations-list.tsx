"use client"

import { useState, useMemo } from 'react';
import { Registration } from '@/lib/types';
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
  FileText
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
import { Card } from '@/components/ui/card';
import { RegistrationFormModal } from './registration-form-modal';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
} from "@/components/ui/dialog";

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
  
  const itemsPerPage = 10;
  const { toast } = useToast();
  const db = useFirestore();

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

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
      await deleteDocumentNonBlocking(doc(db, 'registrations', registrationToDelete.id));
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
    <Card className="p-6 bg-card shadow-sm border-none rounded-xl overflow-hidden">
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground font-headline">Registration Registry</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Found: {filteredRegistrations.length}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={handleExportExcel} variant="outline" className="flex-1 sm:flex-none border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 font-bold text-xs h-11 bg-background">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
              </Button>
              <Button onClick={handleExportPDF} variant="outline" className="flex-1 sm:flex-none border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-bold text-xs h-11 bg-background">
                <FileText className="mr-2 h-4 w-4" /> Export PDF
              </Button>
            </div>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
              <Input 
                placeholder="Search ID, name, or phone..." 
                className="pl-10 h-11 bg-background border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border border-dashed border-border">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Filter className="h-3 w-3" /> Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-background border-border">
                <SelectValue placeholder="All Records" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Processed">Processed</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> From
            </label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> To
            </label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 bg-background border-border"
            />
          </div>
          
          <div className="flex items-end">
            <Button variant="outline" className="h-10 w-full font-bold text-muted-foreground hover:text-foreground bg-background border-border" onClick={resetFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent h-12 border-border">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6 cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground" onClick={() => requestSort('id')}>
                  <div className="flex items-center">Registration ID {getSortIcon('id')}</div>
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground" onClick={() => requestSort('applicantName')}>
                  <div className="flex items-center">Name {getSortIcon('applicantName')}</div>
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground" onClick={() => requestSort('submissionDate')}>
                  <div className="flex items-center">Date {getSortIcon('submissionDate')}</div>
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground" onClick={() => requestSort('phone')}>
                  <div className="flex items-center">Phone {getSortIcon('phone')}</div>
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest cursor-pointer group hover:bg-muted/50 transition-colors text-muted-foreground" onClick={() => requestSort('status')}>
                  <div className="flex items-center">Status {getSortIcon('status')}</div>
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest pr-6 text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length > 0 ? (
                currentItems.map((reg) => (
                  <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors border-border group h-20">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground/30">
                        <FileDigit className="h-3 w-3 opacity-30" />
                        {reg.id}
                      </div>
                    </TableCell>
                    <TableCell><p className="text-sm font-bold text-foreground">{reg.applicantName}</p></TableCell>
                    <TableCell><p className="text-xs font-bold text-muted-foreground">{reg.submissionDate ? format(new Date(reg.submissionDate), 'MMM dd, yyyy') : 'N/A'}</p></TableCell>
                    <TableCell><p className="text-xs font-bold text-muted-foreground">{reg.phone}</p></TableCell>
                    <TableCell><StatusBadge status={reg.status} className="scale-90 origin-left" /></TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-8 font-bold text-xs text-muted-foreground hover:text-primary" onClick={() => setViewingRegistration(reg)}><Eye className="mr-1.5 h-3.5 w-3.5" /> View</Button>
                        <RegistrationFormModal registration={reg} mode="edit" trigger={<Button variant="ghost" size="sm" className="h-8 font-bold text-xs text-muted-foreground hover:text-primary">Edit</Button>} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10" onClick={() => { setRegistrationToDelete({id: reg.id, name: reg.applicantName}); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground/20 bg-muted/5"><p className="text-sm font-medium">No registrations matched your criteria.</p></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!viewingRegistration} onOpenChange={(open) => !open && setViewingRegistration(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-xl border-border bg-popover">
          <DialogHeader className="p-6 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-foreground">Registration Details</DialogTitle>
              {viewingRegistration && <StatusBadge status={viewingRegistration.status} />}
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8 bg-card">
            <div className="grid grid-cols-2 gap-8">
              <DetailItem label="Applicant Name" value={viewingRegistration?.applicantName} icon={User} />
              <DetailItem label="Submission Date" value={viewingRegistration?.submissionDate ? format(new Date(viewingRegistration.submissionDate), 'MMMM dd, yyyy') : 'N/A'} icon={Calendar} />
              <DetailItem label="Phone Number" value={viewingRegistration?.phone} icon={Phone} />
              <DetailItem label="Branch Location" value={viewingRegistration?.location} icon={MapPin} />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Remarks</p>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-xl italic">
                {viewingRegistration?.remarks || "No internal notes recorded."}
              </p>
            </div>
          </div>
          <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
            <Button onClick={() => setViewingRegistration(null)} className="font-bold">Close Record</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-popover border-border rounded-3xl overflow-hidden p-0">
          <div className="p-8 text-center space-y-4">
             <div className="mx-auto bg-destructive/10 p-4 rounded-2xl w-fit">
              {isDeleting ? <Loader2 className="h-8 w-8 text-destructive animate-spin" /> : <Trash2 className="h-8 w-8 text-destructive" />}
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground text-center text-xl font-black uppercase tracking-tight">
                {isDeleting ? "PURGING RECORD..." : "PERMANENT DELETION"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-center">
                {isDeleting 
                  ? `Removing ${registrationToDelete?.name} from bureau registry. Please wait...`
                  : `You are about to permanently delete the record for ${registrationToDelete?.name}. This action cannot be undone.`
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
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Purge Record"}
            </AlertDialogAction>
            {!isDeleting && (
              <AlertDialogCancel 
                onClick={() => setRegistrationToDelete(null)} 
                className="w-full h-10 border-none bg-transparent font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function DetailItem({ label, value, icon: Icon }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-1.5"><Icon className="h-3 w-3" /> {label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
