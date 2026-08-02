
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
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
  Filter
} from 'lucide-react';
import { AuditLog } from '@/lib/types';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AuditLedgerPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const auditQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Fetch a healthy buffer of logs for smooth client-side filtering/paging
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

  // Recalculate pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

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
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
          <Input 
            placeholder="Search forensic records..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-border bg-card rounded-xl text-xs font-bold"
          />
        </div>
      </div>

      <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-3xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pl-8">Timestamp</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5">Official Signature</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5">Action Protocol</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5">Target Reference</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pr-8 text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length > 0 ? paginatedLogs.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/30 transition-colors border-border h-16 group">
                <TableCell className="pl-8">
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
                <TableCell colSpan={5} className="h-60 text-center">
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
