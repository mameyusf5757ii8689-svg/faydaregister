
'use client';

import { useState, useMemo } from 'react';
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
  User
} from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { Registration } from '@/lib/types';
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

export default function StatusCheckPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeRid, setActiveRid] = useState('');

  // Fetch registrations (limit 10,000 as per previous instructions)
  const registrationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'registrations'), limit(10000));
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

  const activeRegistration = useMemo(() => {
    if (!activeRid || !registrations) return null;
    return registrations.find(r => r.id === activeRid);
  }, [activeRid, registrations]);

  const handleInsertRid = (rid: string) => {
    setActiveRid(rid);
    // Copy to clipboard for easy manual paste if auto-fill is blocked by iframe security
    navigator.clipboard.writeText(rid);
    
    toast({
      title: "RID Synchronized",
      description: `ID ${rid} copied to terminal clipboard. Paste into verification form.`,
    });
  };

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
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Cross-Reference Registry with Official Portal</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Secure External Link Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Side: Registry Table & Filters */}
        <div className="xl:col-span-5 space-y-6">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Filter className="h-3 w-3" /> Registry Triage
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-background rounded-full text-muted-foreground border border-border">
                  {filteredRegistrations.length} Records
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search Name, RID, or Phone..." 
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

              <div className="border border-border rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-[9px] font-black uppercase tracking-widest py-3">Applicant</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest py-3">RID</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-widest py-3 pr-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-40 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-20" />
                        </TableCell>
                      </TableRow>
                    ) : filteredRegistrations.length > 0 ? (
                      filteredRegistrations.slice(0, 50).map((reg) => (
                        <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors border-border group">
                          <TableCell className="py-3">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-foreground truncate max-w-[120px]">{reg.applicantName}</p>
                              <p className="text-[9px] font-medium text-muted-foreground flex items-center gap-1">
                                <Phone className="h-2 w-2" /> {reg.phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-muted-foreground/60">
                              {reg.id.substring(0, 8)}...
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3 pr-4">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary hover:text-white transition-all group-hover:shadow-md"
                              onClick={() => handleInsertRid(reg.id)}
                            >
                              Insert <ArrowRight className="ml-1.5 h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-40 text-center">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">No Matching Records</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="p-5 bg-primary/[0.03] border border-primary/10 rounded-2xl space-y-3">
             <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Operational Protocol</span>
             </div>
             <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase tracking-widest">
               Click 'Insert' to copy the RID and reload the verification terminal. Due to security rules, you must manually paste (Ctrl+V) the RID into the portal's input field.
             </p>
          </div>
        </div>

        {/* Right Side: External Status Iframe */}
        <div className="xl:col-span-7">
          <Card className="border border-border shadow-2xl bg-card overflow-hidden rounded-[32px] h-full flex flex-col min-h-[700px]">
            <CardHeader className="bg-muted/30 border-b border-border py-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Official Portal</CardTitle>
              </div>
              {activeRid && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                    <span className="text-[9px] font-black text-primary uppercase tracking-tighter">Active RID: {activeRid}</span>
                  </div>
                  {activeRegistration && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full border border-border">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Registry Status:</span>
                      <StatusBadge status={activeRegistration.status} className="scale-75 origin-left" />
                    </div>
                  )}
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
