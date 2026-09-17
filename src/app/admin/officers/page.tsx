"use client"

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Shield, 
  Loader2, 
  MapPin, 
  Mail, 
  BadgeCheck, 
  Trash2, 
  Edit2, 
  ShieldAlert, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  FileSpreadsheet,
  FileText,
  Activity,
  Clock,
  ExternalLink,
  UserPlus,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
  TrendingUp
} from 'lucide-react';
import { OfficerFormModal } from '@/components/admin/officer-form-modal';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, limit, doc, writeBatch } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { logAuditAction } from '@/lib/audit';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function OfficerManagementPage() {
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isExporting, setIsExporting] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isConfirmBulkPurgeOpen, setIsConfirmBulkPurgeOpen] = useState(false);

  // Deletion state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState<UserProfile | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !currentUser?.uid) return null;
    return doc(db, 'users', currentUser.uid);
  }, [db, currentUser?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !currentUser) return null;
    return query(collection(db, 'users'), limit(10000));
  }, [db, currentUser]);

  const { data: allOfficers, isLoading } = useCollection<UserProfile>(usersQuery);

  const regions = useMemo(() => {
    if (!allOfficers) return [];
    return Array.from(new Set(allOfficers.map(o => o.region).filter(Boolean)));
  }, [allOfficers]);

  const filteredOfficers = useMemo(() => {
    if (!allOfficers) return [];
    return allOfficers.filter(o => {
      const matchesSearch = o.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || o.role === roleFilter;
      const matchesRegion = regionFilter === 'all' || o.region === regionFilter;
      
      return matchesSearch && matchesRole && matchesRegion;
    });
  }, [allOfficers, searchTerm, roleFilter, regionFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOfficers.length / itemsPerPage);
  const paginatedOfficers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOfficers.slice(start, start + itemsPerPage);
  }, [filteredOfficers, currentPage]);

  const allOnPageSelected = paginatedOfficers.length > 0 && paginatedOfficers.every(o => selectedIds.has(o.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      paginatedOfficers.forEach(o => next.delete(o.id));
    } else {
      paginatedOfficers.forEach(o => {
        if (o.id !== currentUser?.uid) next.add(o.id);
      });
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    if (id === currentUser?.uid) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const stats = useMemo(() => {
    if (!allOfficers) return { total: 0, admins: 0, reviewers: 0, onDuty: 0 };
    return {
      total: allOfficers.length,
      admins: allOfficers.filter(o => o.role === 'admin').length,
      reviewers: allOfficers.filter(o => o.role === 'reviewer').length,
      onDuty: allOfficers.filter(o => o.isDutyActive).length,
    };
  }, [allOfficers]);

  const handleBulkPurge = async () => {
    if (!db || selectedIds.size === 0 || !currentUser || !profile) return;
    
    setIsBulkProcessing(true);
    const batch = writeBatch(db);
    const count = selectedIds.size;

    selectedIds.forEach(id => {
      batch.delete(doc(db, 'users', id));
      batch.delete(doc(db, 'admin_users', id));
    });

    try {
      await batch.commit();
      
      logAuditAction(
        db,
        currentUser,
        profile.fullName,
        'RECORD_DELETED',
        'bulk_personnel_purge',
        `Personnel Purge: Permanently revoked access for ${count} officials.`
      );

      toast({
        title: "Access Revoked",
        description: `Successfully purged ${count} official signatures from the bureau.`,
        variant: "destructive"
      });
      setSelectedIds(new Set());
      setIsConfirmBulkPurgeOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Bulk Operation Failed",
        description: "Clearance error during mass personnel revocation.",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredOfficers.length === 0 || !currentUser || !profile) return;
    setIsExporting(true);

    const exportData = filteredOfficers.map(o => ({
      'Full Name': o.fullName,
      'Email': o.email,
      'Role': o.role,
      'Region': o.region,
      'Cluster': o.cluster,
      'Last Active': o.updatedAt ? format(new Date(o.updatedAt), 'yyyy-MM-dd HH:mm') : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personnel");
    XLSX.writeFile(wb, `Bureau_Personnel_${format(new Date(), 'yyyyMMdd')}.xlsx`);

    logAuditAction(
      db, 
      currentUser, 
      profile.fullName, 
      'PERFORMANCE_REVIEW', 
      'personnel_management', 
      `Personnel: Generated XLS employee archive for ${filteredOfficers.length} records.`
    );

    toast({ title: "Excel Ledger Generated", description: "Official personnel registry exported." });
    setTimeout(() => setIsExporting(false), 800);
  };

  const handleExportPDF = () => {
    if (filteredOfficers.length === 0 || !currentUser || !profile) return;
    setIsExporting(true);

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Official Bureau Personnel Ledger", 14, 15);
    const rows = filteredOfficers.map(o => [
      o.fullName, o.email, o.role, o.region, o.cluster, o.updatedAt ? format(new Date(o.updatedAt), 'MMM dd') : '-'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Signature', 'Email', 'Clearance', 'Region', 'Sector', 'Last Sync']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Bureau_Personnel_Ledger_${format(new Date(), 'yyyyMMdd')}.pdf`);

    logAuditAction(
      db, 
      currentUser, 
      profile.fullName, 
      'PERFORMANCE_REVIEW', 
      'personnel_management', 
      `Personnel: Generated PDF employee archive for ${filteredOfficers.length} records.`
    );

    toast({ title: "PDF Record Saved", description: "High-fidelity personnel document generated." });
    setTimeout(() => setIsExporting(false), 800);
  };

  const initiateDelete = (officer: UserProfile) => {
    if (officer.id === currentUser?.uid) {
      toast({
        title: "Action Restricted",
        description: "Protocol prevents deletion of your own administrative signature.",
        variant: "destructive"
      });
      return;
    }
    setOfficerToDelete(officer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!db || !officerToDelete || !currentUser || !profile) return;
    
    setIsDeleting(true);
    try {
      await deleteDocumentNonBlocking(doc(db, 'users', officerToDelete.id));
      if (officerToDelete.role === 'admin') {
        await deleteDocumentNonBlocking(doc(db, 'admin_users', officerToDelete.id));
      }
      
      logAuditAction(
        db,
        currentUser,
        profile.fullName,
        'PERSONNEL_MODIFIED',
        officerToDelete.id,
        `Revoked bureau access for ${officerToDelete.fullName} (${officerToDelete.email}).`
      );

      toast({
        title: "Officer Purged",
        description: `${officerToDelete.fullName} has been removed from the bureau framework.`,
        variant: "destructive"
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "An error occurred while revoking access.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setOfficerToDelete(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Bureau Administration</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-headline">Officer Command</h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            Register official signatures, manage field permissions, and monitor personnel pulse across all regions.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button onClick={handleExportExcel} disabled={isExporting} variant="outline" className="h-11 px-4 rounded-xl border-emerald-500/20 text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-card">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          </Button>
          <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="h-11 px-4 rounded-xl border-rose-500/20 text-rose-500 font-bold text-[10px] uppercase tracking-widest bg-card">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          </Button>
          <OfficerFormModal mode="add" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatSummary label="Total Active" value={stats.total} icon={Users} color="text-primary" />
        <StatSummary label="Command Pulse" value={stats.onDuty} icon={Activity} color="text-emerald-500" />
        <StatSummary label="Field Units" value={stats.reviewers} icon={Shield} color="text-blue-500" />
        <StatSummary label="Admins" value={stats.admins} icon={BadgeCheck} color="text-amber-500" />
      </div>

      <Card className="border border-border shadow-sm overflow-hidden bg-card rounded-[32px] relative">
        <div className="p-6 border-b border-border bg-muted/10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search identity or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-border bg-background rounded-xl text-xs font-bold"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-11 bg-background border-border rounded-xl text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 opacity-30" />
                    <SelectValue placeholder="Clearance" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Ranks</SelectItem>
                  <SelectItem value="admin" className="text-[10px] font-bold uppercase">Bureau Admin</SelectItem>
                  <SelectItem value="reviewer" className="text-[10px] font-bold uppercase">Field Officer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="h-11 bg-background border-border rounded-xl text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 opacity-30" />
                    <SelectValue placeholder="Region" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Regions</SelectItem>
                  {regions.map(r => (
                    <SelectItem key={r} value={r} className="text-[10px] font-bold uppercase">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" className="h-11 font-black text-[10px] uppercase tracking-widest text-muted-foreground" onClick={() => { setSearchTerm(''); setRoleFilter('all'); setRegionFilter('all'); }}>
                Reset Matrix
              </Button>
          </div>
        </div>

        {/* Bulk Command Matrix - Responsive Overlay */}
        {selectedIds.size > 0 && (
          <div className="absolute top-0 left-0 right-0 z-30 min-h-[4rem] h-auto bg-primary text-primary-foreground flex flex-col sm:flex-row items-center px-6 py-3 sm:py-0 gap-4 sm:gap-6 animate-in slide-in-from-top duration-500 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-widest flex-1 text-center sm:text-left">
              {selectedIds.size} Personnel Selected
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
              <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/10" onClick={() => setSelectedIds(new Set())}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <div className="hidden sm:block w-px h-6 bg-white/20" />
              <Button variant="ghost" size="sm" className="h-9 px-6 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 text-white" onClick={() => setIsConfirmBulkPurgeOpen(true)} disabled={isBulkProcessing}>
                {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Purge Access
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-40"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>
          ) : paginatedOfficers && paginatedOfficers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border hover:bg-transparent h-16">
                      <TableHead className="w-12 pl-8">
                        <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} className="border-muted-foreground/30" />
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase h-14 pl-4 text-muted-foreground tracking-widest">Official Signature</TableHead>
                      <TableHead className="text-[9px] font-black uppercase h-14 text-muted-foreground tracking-widest hidden lg:table-cell">Clearance</TableHead>
                      <TableHead className="text-[9px] font-black uppercase h-14 text-muted-foreground tracking-widest hidden sm:table-cell">Deployment</TableHead>
                      <TableHead className="text-[9px] font-black uppercase h-14 text-muted-foreground tracking-widest">Status</TableHead>
                      <TableHead className="text-[9px] font-black uppercase h-14 pr-8 text-right text-muted-foreground tracking-widest">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOfficers.map((officer) => {
                      const isMe = officer.id === currentUser?.uid;
                      return (
                        <TableRow key={officer.id} className={cn(
                          "hover:bg-muted/30 transition-colors group border-border h-24",
                          selectedIds.has(officer.id) && "bg-primary/[0.02]"
                        )}>
                          <TableCell className="pl-8">
                            {!isMe && (
                              <Checkbox 
                                checked={selectedIds.has(officer.id)} 
                                onCheckedChange={() => toggleSelectRow(officer.id)}
                                className="border-muted-foreground/30"
                              />
                            )}
                          </TableCell>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-5">
                              <div className="relative">
                                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-background shadow-xl">
                                  <AvatarImage src={officer.profilePhoto} />
                                  <AvatarFallback className="font-black text-[10px] bg-muted/50">{officer.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className={cn(
                                  "absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                                  officer.isDutyActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                                )} />
                              </div>
                              <div>
                                <p className="text-base font-black text-foreground tracking-tight whitespace-nowrap flex items-center gap-1.5">
                                  {officer.fullName}
                                  {isMe && <span className="text-[8px] font-black uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Mail className="h-3 w-3 text-muted-foreground/30" />
                                  <span className="text-[10px] font-bold text-muted-foreground">{officer.email}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-col gap-1">
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-1 rounded-lg tracking-tighter w-fit",
                                officer.role === 'admin' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                              )}>
                                {officer.role}
                              </span>
                              <p className="text-[8px] font-mono text-muted-foreground/30 uppercase tracking-tighter">UID: {officer.id.substring(0, 10)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-black text-foreground uppercase">
                                <MapPin className="h-3 w-3 text-primary/40" />
                                {officer.region}
                              </div>
                              <p className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest pl-4.5">{officer.cluster}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                                 {officer.isDutyActive ? (
                                   <span className="text-emerald-600 flex items-center gap-1"><Activity className="h-3 w-3" /> Active</span>
                                 ) : (
                                   <span className="text-muted-foreground/40">Offline</span>
                                 )}
                               </div>
                               <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                                 <Clock className="h-2.5 w-2.5" />
                                 {officer.updatedAt ? format(new Date(officer.updatedAt), 'MMM dd, HH:mm') : 'No sync'}
                               </div>
                            </div>
                          </TableCell>
                          <TableCell className="pr-8 text-right">
                            <div className="flex items-center justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                              <Button variant="ghost" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl" asChild>
                                <Link href={`/performance?officerId=${officer.id}`}>
                                   <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Intelligence
                                </Link>
                              </Button>
                              <OfficerFormModal 
                                mode="edit" 
                                officer={officer} 
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                } 
                              />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 rounded-xl"
                                onClick={() => initiateDelete(officer)}
                                disabled={isMe}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-muted/5 border-t border-border gap-6">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                    Visualizing {paginatedOfficers.length} of {filteredOfficers.length} Personnel
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 w-11 p-0 rounded-xl border-border bg-background hover:bg-muted"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center justify-center min-w-[120px] h-11 text-[10px] font-black text-foreground bg-muted/50 border border-border rounded-xl uppercase tracking-widest px-3">
                      Page {currentPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 w-11 p-0 rounded-xl border-border bg-background hover:bg-muted"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground/30">
              <div className="p-8 bg-muted/50 rounded-full border border-dashed border-border mb-6">
                <Users className="h-16 w-16 opacity-10" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.4em] text-center">Zero Matches in Sector</p>
              <p className="text-xs text-center px-12 mt-2 font-medium italic">Adjust your filters or initialize new personnel registration.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Purge Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-md p-0 overflow-hidden mx-4">
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto bg-destructive/10 p-5 rounded-2xl w-fit">
              {isDeleting ? <Loader2 className="h-10 w-10 text-destructive animate-spin" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tighter uppercase">
                {isDeleting ? "PURGING SIGNATURE..." : "REVOKE ACCESS?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed font-medium">
                {isDeleting 
                  ? `Removing ${officerToDelete?.fullName} from bureau protocols. Please wait...`
                  : `You are about to purge ${officerToDelete?.fullName} from the bureau. This action is final and will revoke all terminal credentials immediately.`
                }
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-col gap-3">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); confirmDelete(); }} 
              disabled={isDeleting}
              className="w-full h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/10 transition-all active:scale-[0.98]"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Revocation"}
            </AlertDialogAction>
            {!isDeleting && (
              <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-none bg-transparent hover:bg-card">
                Abort Operation
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Purge Confirmation */}
      <AlertDialog open={isConfirmBulkPurgeOpen} onOpenChange={setIsConfirmBulkPurgeOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-md p-0 overflow-hidden mx-4">
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto bg-destructive/10 p-5 rounded-2xl w-fit">
              {isBulkProcessing ? <Loader2 className="h-10 w-10 text-destructive animate-spin" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                {isBulkProcessing ? "PURGING PERSONNEL..." : "MASS REVOCATION"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed font-medium">
                {isBulkProcessing 
                  ? "Executing mass signature revocation. Synchronizing with audit ledger..."
                  : `You are about to permanently purge ${selectedIds.size} officials from the bureau database. This operation cannot be reversed.`
                }
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-row gap-3">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleBulkPurge(); }} 
              disabled={isBulkProcessing}
              className="w-full h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/10 active:scale-[0.98] transition-all"
            >
              {isBulkProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Destruction"}
            </AlertDialogAction>
            {!isBulkProcessing && (
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

function StatSummary({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="border border-border shadow-sm bg-card rounded-[24px] overflow-hidden group hover:shadow-lg transition-all">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</p>
          <div className={`p-3 rounded-2xl bg-muted/50 border border-border group-hover:bg-background transition-all ${color}`}><Icon className="h-5 w-5" /></div>
        </div>
        <p className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
