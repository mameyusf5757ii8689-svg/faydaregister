
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Search, 
  Info, 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  Filter, 
  Calendar,
  Loader2,
  FileDigit,
  Phone,
  User,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, limit, doc, where } from 'firebase/firestore';
import { Registration, RegistrationStatus, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { logAuditAction } from '@/lib/audit';

export default function StatusCheckPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeRid, setActiveRid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    return registrations.filter(reg => {
      const matchesSearch = 
        reg.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.id.includes(searchTerm) ||
        reg.phone.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
      
      let matchesDate = true;
      if (selectedDate) {
        try {
          const regDate = new Date(reg.submissionDate);
          const filterDate = new Date(selectedDate);
          matchesDate = isWithinInterval(regDate, { 
            start: startOfDay(filterDate), 
            end: endOfDay(filterDate) 
          });
        } catch {
          matchesDate = true;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [registrations, searchTerm, statusFilter, selectedDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedDate]);

  const paginatedRegistrations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRegistrations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRegistrations, currentPage]);

  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);

  const activeRegistration = useMemo(() => {
    if (!activeRid || !registrations) return null;
    return registrations.find(r => r.id === activeRid);
  }, [activeRid, registrations]);

  const handleInsertRid = (reg: Registration) => {
    setActiveRid(reg.id);
    navigator.clipboard.writeText(reg.id);
    
    // Read-Audit Protocol
    if (db && user && profile) {
      logAuditAction(
        db, 
        user, 
        profile.fullName, 
        'VERIFICATION_CHECK', 
        reg.id, 
        `Verification Terminal: Initialized check protocol for applicant: ${reg.applicantName}.`
      );
    }

    toast({
      title: "RID Synchronized",
      description: `ID ${reg.id} copied to terminal clipboard. Paste into verification form.`,
    });
  };

  const handleStatusUpdate = (newStatus: RegistrationStatus) => {
    if (!db || !activeRegistration || !user || !profile) return;
    
    setIsUpdating(true);
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      remarks: `${activeRegistration.remarks || ''}\n[VERIFICATION TERMINAL]: Status updated to ${newStatus} on ${format(new Date(), 'MMM dd, HH:mm')}`
    };

    if (newStatus === 'Processed' || newStatus === 'Processing') {
      updateData.rejectionReason = '';
    }

    updateDocumentNonBlocking(doc(db, 'registrations', activeRegistration.id), updateData);
    
    logAuditAction(
      db, 
      user,
      profile.fullName,
      'STATUS_UPDATE', 
      activeRegistration.id, 
      `Verification Terminal: Changed status for ${activeRegistration.applicantName} to ${newStatus}.`
    );

    toast({
      title: "Registry Synchronized",
      description: `Status for ${activeRegistration.applicantName} updated to ${newStatus}.`,
    });
    
    setTimeout(() => setIsUpdating(false), 500);
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Verifying Terminal Clearance...</p>
        </div>
      </div>
    );
  }

  const iframeSrc = activeRid 
    ? `https://resident.fayda.et/status?rid=${activeRid}` 
    : 'https://resident.fayda.et/status';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link href="/dashboard" className="flex items-center text-[10px] font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest gap-1.5 mb-2">
            <ArrowLeft className="h-3 w-3" /> Return to Command
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Verification Terminal</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Authorized Verification Gateway</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
            <User className="h-3.5 w-3.5 text-primary opacity-40" />
            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Local Session Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Filter className="h-3 w-3" /> Your Registry
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-background rounded-full text-muted-foreground border border-border">
                  {filteredRegistrations.length} Assigned
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search Name or RID..." 
                  className="pl-10 h-11 bg-background border-border rounded-xl text-xs font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 bg-background border-border rounded-xl text-[10px] font-bold uppercase tracking-widest">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px] font-bold uppercase">All Status</SelectItem>
                    <SelectItem value="Processed" className="text-[10px] font-bold uppercase">Processed</SelectItem>
                    <SelectItem value="Processing" className="text-[10px] font-bold uppercase">Processing</SelectItem>
                    <SelectItem value="Pending Review" className="text-[10px] font-bold uppercase">Pending</SelectItem>
                    <SelectItem value="Rejected" className="text-[10px] font-bold uppercase">Rejected</SelectItem>
                    <SelectItem value="Failed" className="text-[10px] font-bold uppercase">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 pointer-events-none" />
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-9 h-10 bg-background border-border rounded-xl text-[10px] font-bold uppercase"
                  />
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-x-auto min-h-[400px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-[9px] font-black uppercase tracking-widest py-3">Applicant</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-widest py-3 pr-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="h-40 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-20" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedRegistrations.length > 0 ? (
                      paginatedRegistrations.map((reg) => (
                        <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors border-border group">
                          <TableCell className="py-3">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-foreground truncate max-w-[150px]">{reg.applicantName}</p>
                              <p className="text-[9px] font-mono font-bold text-muted-foreground/40">{reg.id.substring(0, 15)}...</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3 pr-4">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary hover:text-white transition-all group-hover:shadow-md"
                              onClick={() => handleInsertRid(reg)}
                            >
                              Verify <ArrowRight className="ml-1.5 h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="h-40 text-center">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">No Matching Records</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
                   <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-border" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-border" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-8">
          <Card className="border border-border shadow-2xl bg-card overflow-hidden rounded-[32px] h-full flex flex-col min-h-[700px]">
            <CardHeader className="bg-muted/30 border-b border-border py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Official Portal Gateway</CardTitle>
              </div>
              
              {activeRid && activeRegistration && (
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end animate-in fade-in zoom-in duration-300">
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
                    <span className="text-[9px] font-black text-primary uppercase tracking-tighter">RID: {activeRid}</span>
                    <div className="h-3 w-px bg-primary/20 mx-1" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Registry:</span>
                      <StatusBadge status={activeRegistration.status} className="scale-75 origin-left" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-xl shadow-sm">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sync:</span>
                    <Select 
                      disabled={isUpdating} 
                      value={activeRegistration.status} 
                      onValueChange={(val: any) => handleStatusUpdate(val)}
                    >
                      <SelectTrigger className="h-7 w-[120px] border-none bg-transparent p-0 focus:ring-0">
                        <div className="flex items-center justify-end w-full">
                           {isUpdating ? (
                             <Loader2 className="h-3 w-3 animate-spin text-primary" />
                           ) : (
                             <span className="text-[10px] font-black text-primary uppercase">Update Result</span>
                           )}
                        </div>
                      </SelectTrigger>
                      <SelectContent align="end" className="bg-popover border-border p-1 rounded-xl">
                        <SelectItem value="Pending Review" className="text-[10px] font-bold uppercase">Pending</SelectItem>
                        <SelectItem value="Processing" className="text-[10px] font-bold uppercase">Processing</SelectItem>
                        <SelectItem value="Processed" className="text-[10px] font-bold uppercase">Processed</SelectItem>
                        <SelectItem value="Rejected" className="text-[10px] font-bold uppercase">Rejected</SelectItem>
                        <SelectItem value="Failed" className="text-[10px] font-bold uppercase">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 relative flex-1 bg-muted/5">
              <div className="absolute inset-0 flex items-center justify-center -z-10">
                <div className="flex flex-col items-center gap-3 opacity-20">
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Connecting to Government Gateway...</p>
                </div>
              </div>
              <iframe 
                src={iframeSrc} 
                className="w-full h-full min-h-[650px] border-none"
                title="Official Fayda Status Check"
                loading="lazy"
                allow="geolocation"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
