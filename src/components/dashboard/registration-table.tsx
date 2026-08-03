
"use client"

import { useState, useMemo } from 'react';
import { Registration, RegistrationStatus, UserProfile } from '@/lib/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Trash2,
  CheckCircle2,
  RefreshCcw,
  X,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { StatusBadge } from './status-badge';
import { AiSuggestionModal } from './ai-suggestion-modal';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/audit';
import { cn } from '@/lib/utils';
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

interface RegistrationTableProps {
  registrations: Registration[];
  isDashboardView?: boolean;
}

export function RegistrationTable({ registrations, isDashboardView = false }: RegistrationTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const itemsPerPage = 10;
  
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const totalPages = Math.ceil(registrations.length / itemsPerPage);
  const currentItems = registrations.slice(
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
        `Bulk Triage: Updated ${count} records to ${newStatus}.`
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
        `Bulk Purge: Permanently removed ${count} records from registry.`
      );

      toast({
        title: "Registry Purged",
        description: `Successfully removed ${count} records from the active ledger.`,
        variant: "destructive"
      });
      setSelectedIds(new Set());
      setIsConfirmDeleteDialogOpen(false);
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

  return (
    <div className={cn(
      "relative",
      isDashboardView ? "" : "rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    )}>
      {/* Bulk Action Overlay */}
      {selectedIds.size > 0 && (
        <div className="absolute top-0 left-0 right-0 z-20 h-12 bg-primary text-primary-foreground flex items-center px-6 gap-4 animate-in slide-in-from-top duration-300 shadow-lg">
          <p className="text-[10px] font-black uppercase tracking-widest flex-1">
            {selectedIds.size} Selected for Triage
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-[9px] font-black uppercase tracking-tighter hover:bg-white/10"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-[9px] font-black uppercase tracking-tighter hover:bg-white/10"
              onClick={() => handleBulkStatusUpdate('Processed')}
              disabled={isBulkProcessing}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Processed
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-[9px] font-black uppercase tracking-tighter hover:bg-white/10"
              onClick={() => handleBulkStatusUpdate('Processing')}
              disabled={isBulkProcessing}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Active
            </Button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-[9px] font-black uppercase tracking-tighter hover:bg-red-500 text-white"
              onClick={() => setIsConfirmDeleteDialogOpen(true)}
              disabled={isBulkProcessing}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Purge
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader className={isDashboardView ? "bg-muted/30" : "bg-muted/50"}>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-12 pl-6">
              <Checkbox 
                checked={allOnPageSelected} 
                onCheckedChange={toggleSelectAll}
                className="border-muted-foreground/30"
              />
            </TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Name</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Date</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Status</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Location</TableHead>
            {!isDashboardView && <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((reg) => (
            <TableRow 
              key={reg.id} 
              className={cn(
                "hover:bg-muted/30 transition-colors border-border h-16 group",
                selectedIds.has(reg.id) && "bg-primary/5 hover:bg-primary/10"
              )}
            >
              <TableCell className="pl-6">
                <Checkbox 
                  checked={selectedIds.has(reg.id)} 
                  onCheckedChange={() => toggleSelectRow(reg.id)}
                  className="border-muted-foreground/30"
                />
              </TableCell>
              <TableCell className="py-4 font-medium text-foreground text-sm">
                {reg.applicantName}
              </TableCell>
              <TableCell className="py-4 text-muted-foreground text-sm">
                {format(new Date(reg.submissionDate), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell className="py-4">
                <StatusBadge status={reg.status} className="scale-90 origin-left" />
              </TableCell>
              <TableCell className="py-4 text-muted-foreground text-sm">
                {reg.location}
              </TableCell>
              {!isDashboardView && (
                <TableCell className="text-right py-4 pr-6">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AiSuggestionModal registration={reg} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted rounded-full">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-popover border-border p-1 rounded-xl shadow-xl">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5">Protocols</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem className="flex items-center text-xs font-bold rounded-lg cursor-pointer text-foreground hover:bg-muted">
                          <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Record
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold rounded-lg cursor-pointer text-foreground hover:bg-muted">Verify Status</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem className="text-xs font-bold text-destructive hover:text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg cursor-pointer">
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Purge Entry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Showing {currentItems.length} of {registrations.length} records • Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Purge Confirmation Dialog */}
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-md p-0 overflow-hidden">
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto bg-destructive/10 p-5 rounded-2xl w-fit">
              {isBulkProcessing ? <Loader2 className="h-10 w-10 text-destructive animate-spin" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                {isBulkProcessing ? "PURGING REGISTRY..." : "BULK PURGE PROTOCOL"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed font-medium">
                {isBulkProcessing 
                  ? "Executing mass record destruction. Please stand by..."
                  : `You are about to permanently purge ${selectedIds.size} records from the bureau registry. This action is final and will be logged in the forensic ledger.`
                }
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-col gap-3">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }} 
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
