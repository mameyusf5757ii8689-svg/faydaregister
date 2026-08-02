
'use client';

import { useMemo, useState } from 'react';
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
import { ShieldCheck, Loader2, User, Clock, Activity, Search, FileDigit } from 'lucide-react';
import { AuditLog } from '@/lib/types';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function AuditLedgerPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const auditQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(200));
  }, [db, user]);

  const { data: logs, isLoading } = useCollection<AuditLog>(auditQuery);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => 
      log.officerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
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
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5">Target ID</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest py-5 pr-8">Operational Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/30 transition-colors border-border h-16">
                <TableCell className="pl-8">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                    <Clock className="h-3 w-3 opacity-30" />
                    {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM dd, HH:mm:ss') : 'Just now'}
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
                    {log.action.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-muted-foreground">
                    <FileDigit className="h-3 w-3 opacity-20" />
                    {log.targetId?.substring(0, 15)}...
                  </div>
                </TableCell>
                <TableCell className="pr-8">
                  <p className="text-[10px] font-medium text-foreground/80 leading-relaxed italic truncate max-w-xs">
                    {log.details}
                  </p>
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
      </Card>
    </div>
  );
}
