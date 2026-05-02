"use client"

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Loader2, MapPin, Mail, BadgeCheck, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { OfficerFormModal } from '@/components/admin/officer-form-modal';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, limit, doc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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

export default function OfficerManagementPage() {
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState<UserProfile | null>(null);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !currentUser) return null;
    return query(collection(db, 'users'), limit(100));
  }, [db, currentUser]);

  const { data: officers, isLoading } = useCollection<UserProfile>(usersQuery);

  const stats = useMemo(() => {
    if (!officers) return { total: 0, admins: 0, reviewers: 0 };
    return {
      total: officers.length,
      admins: officers.filter(o => o.role === 'admin').length,
      reviewers: officers.filter(o => o.role === 'reviewer').length,
    };
  }, [officers]);

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
    if (!db || !officerToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDocumentNonBlocking(doc(db, 'users', officerToDelete.id));
      if (officerToDelete.role === 'admin') {
        await deleteDocumentNonBlocking(doc(db, 'admin_users', officerToDelete.id));
      }
      
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
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline">Officer Command</h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            Register new official signatures, manage field permissions, and monitor personnel clusters.
          </p>
        </div>
        <OfficerFormModal mode="add" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatSummary label="Total Active" value={stats.total} icon={Users} color="text-primary" />
        <StatSummary label="Field Officers" value={stats.reviewers} icon={Shield} color="text-emerald-500" />
        <StatSummary label="Bureau Admins" value={stats.admins} icon={BadgeCheck} color="text-amber-500" />
      </div>

      <Card className="border border-border shadow-sm overflow-hidden bg-card rounded-3xl">
        <CardHeader className="bg-muted/10 border-b border-border py-6 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest">Authorized Personnel Ledger</CardTitle>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>
          ) : officers && officers.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[9px] font-black uppercase h-14 pl-8 text-muted-foreground tracking-widest">Official Signature</TableHead>
                  <TableHead className="text-[9px] font-black uppercase h-14 text-muted-foreground tracking-widest">Terminal</TableHead>
                  <TableHead className="text-[9px] font-black uppercase h-14 text-muted-foreground tracking-widest">Clearance</TableHead>
                  <TableHead className="text-[9px] font-black uppercase h-14 text-muted-foreground tracking-widest">Sector</TableHead>
                  <TableHead className="text-[9px] font-black uppercase h-14 pr-8 text-right text-muted-foreground tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officers.map((officer) => (
                  <TableRow key={officer.id} className="hover:bg-muted/30 transition-colors group border-border h-20">
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 border-2 border-background shadow-md">
                          <AvatarImage src={officer.profilePhoto} />
                          <AvatarFallback className="font-black text-[10px]">{officer.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-black text-foreground tracking-tight">{officer.fullName}</p>
                          <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-tighter">UID: {officer.id.substring(0, 12)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold">
                        <Mail className="h-3.5 w-3.5 opacity-30" />
                        {officer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-tighter ${
                        officer.role === 'admin' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {officer.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-foreground/80 uppercase">
                          <MapPin className="h-3 w-3 text-muted-foreground/30" />
                          {officer.region}
                        </div>
                        <p className="text-[9px] text-muted-foreground/50 font-bold uppercase ml-4.5">{officer.cluster}</p>
                      </div>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <OfficerFormModal 
                          mode="edit" 
                          officer={officer} 
                          trigger={
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          } 
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
                          onClick={() => initiateDelete(officer)}
                          disabled={officer.id === currentUser?.uid}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground/30">
              <Users className="h-16 w-16 mb-4 opacity-10" />
              <p className="text-sm font-black uppercase tracking-widest">No Registered Personnel</p>
              <p className="text-xs">Initialize the first official record to begin.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-md p-0 overflow-hidden">
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto bg-destructive/10 p-5 rounded-2xl w-fit">
              {isDeleting ? <Loader2 className="h-10 w-10 text-destructive animate-spin" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tighter">
                {isDeleting ? "PURGING SIGNATURE..." : "REVOKE BUREAU ACCESS?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed font-medium">
                {isDeleting 
                  ? `Removing ${officerToDelete?.fullName} from all bureau frameworks. Please stand by...`
                  : `You are about to purge ${officerToDelete?.fullName} from the system. This action is final and will revoke all terminal credentials immediately.`
                }
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 flex-col sm:flex-col gap-3">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); confirmDelete(); }} 
              disabled={isDeleting}
              className="w-full h-14 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-destructive/10"
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
    </div>
  );
}

function StatSummary({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
          <div className={`p-2 rounded-lg bg-muted/50 ${color}`}><Icon className="h-4 w-4" /></div>
        </div>
        <p className="text-3xl font-black text-foreground tracking-tighter">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
