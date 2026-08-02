
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ShieldCheck, 
  Loader2, 
  User, 
  Clock, 
  Activity, 
  Search, 
  FileDigit,
  Eye,
  Fingerprint,
  History,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { AuditLog, UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { logAuditAction } from '@/lib/audit';
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

export default function AuditLedgerPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPurging, setIsPurging] = useState(false);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const auditQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(500));
  }, [db, user]);

  const { data: logs, isLoading } = useCollection<AuditLog>(auditQuery);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => 
      log.officerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedLogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLogs.map(l => l.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const isVerified = useMemo(() => {
    return purgeConfirmationText.trim().toUpperCase() === 'DELETE';
  }, [purgeConfirmationText]);

  const handleBulkPurge = async () => {
    if (!db || selectedIds.size === 0 || !user || !profile || !isVerified) return;
    
    setIsPurging(true);
    const batch = writeBatch(db);
    const count = selectedIds.size;
    
    selectedIds.forEach(id => {
      batch.delete(doc(db, 'audit_logs', id));
    });

    try {
      await batch.commit();
      
      logAuditAction(
        db,
        user,
        profile.fullName,
        'RECORD_DELETED',
        'audit_ledger',
        `Administrative Purge: Permanently deleted ${count} forensic records from the ledger.`
      );

      toast({
        title: "Ledger Purged",
        description: `Successfully removed ${count} records from the forensic archive.`,
      });
      setSelectedIds(new Set());
      setPurgeConfirmationText('');
      setIsPurgeDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Purge Failed",
        description: "Insufficient clearance or protocol error during deletion.",
      });
    } finally {
      setIsPurging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Accessing Forensic Vault</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Security Protocol</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Forensic Audit Ledger</h1>
          <p className="text-sm text-muted-foreground">Chronological record of all critical bureau operations and official signatures.</p>
        </div>
        <div className="flex items-center gap-4 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
            <Input 
              placeholder="Search forensic records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-border bg-card rounded-xl text-xs font-bold"
            />
          </div>
          {selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              className="h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-destructive/10 animate-in zoom-in duration-300"
              onClick={() => {
                setPurgeConfirmationText('');
                setIsPurgeDialogOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Purge ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-3xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-12 pl-8">
                <Checkbox 
                  checked={selectedIds.size === paginatedLogs.length && paginatedLogs.length > 0} 
                  onCheckedChange={toggleSelectAll}
                  className="rounded-md border-muted-foreground/30"
                />
              </TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5">Timestamp</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5">Official Signature</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5">Action Protocol</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5">Target Reference</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pr-8 text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length > 0 ? paginatedLogs.map((log) => (
              <TableRow 
                key={log.id} 
                className={cn(
                  "hover:bg-muted/30 transition-colors border-border h-16 group",
                  selectedIds.has(log.id) && "bg-primary/[0.02]"
                )}
              >
                <TableCell className="pl-8">
                  <Checkbox 
                    checked={selectedIds.has(log.id)} 
                    onCheckedChange={() => toggleSelectRow(log.id)}
                    className="rounded-md border-muted-foreground/30"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                    <Clock className="h-3 w-3 opacity-30" />
                    {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-primary/40" />
                    <span className="text-xs font-black text-foreground">{log.officerName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 tracking-tighter">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-muted-foreground/40">
                    <FileDigit className="h-3 w-3" />
                    {log.targetId?.substring(0, 15)}...
                  </div>
                </TableCell>
                <TableCell className="pr-8 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-60 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 opacity-20">
                    <ShieldCheck className="h-12 w-12 text-muted-foreground" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Forensic Scan Complete: Zero Records Found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-4 bg-muted/10 border-t border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Showing {paginatedLogs.length} of {filteredLogs.length} Forensic Records
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
      </Card>

      {/* Bulk Purge Dialog */}
      <AlertDialog open={isPurgeDialogOpen} onOpenChange={(open) => {
        if (!open && !isPurging) {
          setPurgeConfirmationText('');
          setIsPurgeDialogOpen(false);
        }
      }}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-md p-0 overflow-hidden">
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto bg-destructive/10 p-5 rounded-2xl w-fit">
              {isPurging ? <Loader2 className="h-10 w-10 text-destructive animate-spin" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                  {isPurging ? "PURGING LEDGER..." : "PURGE PROTOCOL"}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed font-medium">
                  {isPurging 
                    ? "Executing bulk deletion of forensic signatures. Please stand by..."
                    : `You are about to permanently delete ${selectedIds.size} records from the forensic ledger. This action cannot be reversed.`
                  }
                </AlertDialogDescription>
              </div>

              {!isPurging && (
                <div className="space-y-3 pt-2 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">
                    Type <span className="text-destructive font-black">DELETE</span> to confirm
                  </Label>
                  <Input 
                    value={purgeConfirmationText}
                    onChange={(e) => setPurgeConfirmationText(e.target.value)}
                    placeholder="Confirmation phrase..."
                    className="h-12 bg-background border-border focus:border-destructive/50 rounded-xl text-center font-black tracking-widest uppercase placeholder:font-bold placeholder:tracking-normal placeholder:text-muted-foreground/20"
                  />
                </div>
              )}
            </div>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-col gap-3">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleBulkPurge(); }} 
              disabled={isPurging || !isVerified}
              className="w-full h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/10 disabled:opacity-30 disabled:grayscale"
            >
              {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Destruction"}
            </AlertDialogAction>
            {!isPurging && (
              <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-none bg-transparent hover:bg-card">
                Abort Operation
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forensic Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-popover">
          <DialogHeader className="p-8 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                   <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight">Audit Signature Details</DialogTitle>
                   <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bureau Internal Security Record</DialogDescription>
                </div>
              </div>
              {selectedLog && (
                <span className="text-[9px] font-black uppercase px-2 py-1 bg-primary text-primary-foreground rounded-lg tracking-widest">
                  {selectedLog.action.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="p-8 space-y-8 bg-card">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <User className="h-3 w-3" /> Official Identity
                </p>
                <p className="text-sm font-black text-foreground">{selectedLog?.officerName}</p>
                <p className="text-[9px] font-mono text-muted-foreground font-bold">UID: {selectedLog?.officerId}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Precise Timestamp
                </p>
                <p className="text-sm font-black text-foreground">
                  {selectedLog?.timestamp?.toDate ? format(selectedLog.timestamp.toDate(), 'MMMM dd, yyyy') : '...'}
                </p>
                <p className="text-[9px] font-mono text-muted-foreground font-bold">
                  {selectedLog?.timestamp?.toDate ? format(selectedLog.timestamp.toDate(), 'HH:mm:ss.SSS') : '...'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
               <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <History className="h-16 w-16" />
                  </div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Activity className="h-3 w-3" /> Operational Payload
                  </p>
                  <p className="text-sm font-medium text-foreground leading-relaxed italic relative z-10">
                    "{selectedLog?.details}"
                  </p>
               </div>

               <div className="flex items-center justify-between p-4 bg-primary/[0.03] border border-primary/10 rounded-2xl">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <FileDigit className="h-3 w-3" /> Target Reference ID
                    </p>
                    <p className="text-[11px] font-mono font-bold text-primary">{selectedLog?.targetId}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center">
                    <Fingerprint className="h-5 w-5 text-muted-foreground/30" />
                  </div>
               </div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
            <Button 
              onClick={() => setSelectedLog(null)} 
              className="font-black text-[10px] uppercase tracking-widest h-10 px-8 rounded-xl"
            >
              Close Ledger Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
