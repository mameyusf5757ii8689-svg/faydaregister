
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, UserCircle, Loader2, ShieldCheck, LogOut, Mail, Fingerprint, ChevronRight, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, collection, query, limit } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminsExist, setAdminsExist] = useState<boolean | null>(null);
  
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const adminCheckQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'admin_users'), limit(1));
  }, [db]);

  const { data: adminDocs, isLoading: isAdminCheckLoading } = useCollection(adminCheckQuery);

  useEffect(() => {
    if (adminDocs !== null) {
      const exists = adminDocs.length > 0;
      setAdminsExist(exists);
      
      if (exists) {
        setMode('login');
      } else if (adminsExist === null) {
        setMode('register');
      }
    }
  }, [adminDocs, adminsExist]);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && user && profile) {
      if (profile.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, profile, isUserLoading, isProfileLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (mode === 'login') {
        initiateEmailSignIn(auth, email, password);
        // We don't set isSubmitting false immediately as redirect will happen
        setTimeout(() => setIsSubmitting(false), 2000);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const now = new Date().toISOString();

        const profileData = {
          id: uid,
          fullName: fullName,
          email: email,
          role: 'admin',
          region: 'Headquarters',
          cluster: 'Central',
          profilePhoto: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
          lastAnnouncementReadAt: now,
          lastMessageReadAt: now,
          updatedAt: now,
        };

        await setDocumentNonBlocking(doc(db, 'users', uid), profileData, { merge: true });
        await setDocumentNonBlocking(doc(db, 'admin_users', uid), { active: true }, { merge: true });

        toast({
          title: "Admin Initialized",
          description: "Bureau administrative signature has been established.",
        });
      }
    } catch (error: any) {
      const isPermission = error.code === 'permission-denied' || error.message?.includes('permissions');
      
      if (isPermission) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'users or admin_users',
          operation: 'create',
          requestResourceData: { email }
        }));
      }

      toast({
        title: mode === 'login' ? "Access Denied" : "Initialization Failed",
        description: error.message || "Credential validation error.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const isInitializing = isUserLoading || isAdminCheckLoading;

  if (isInitializing && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground animate-pulse">Gateway Handshake</p>
        </div>
      </div>
    );
  }

  const isStuck = user && !profile && !isProfileLoading && !isAdminCheckLoading;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* Background Technical Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Card className="border border-border shadow-2xl bg-card/50 backdrop-blur-xl rounded-[32px] overflow-hidden">
          <CardHeader className="space-y-8 text-center pt-10 pb-8 px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 p-4 transition-transform duration-700 hover:scale-110">
              <Image 
                src="https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw"
                alt="FaydaTrack Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black tracking-tighter text-foreground uppercase leading-none">
                Bureau <span className="text-primary italic">Terminal</span>
              </CardTitle>
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-3 w-3 text-muted-foreground/40" />
                <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                  Authorized Personnel Entry
                </CardDescription>
              </div>
            </div>
            
            {!isStuck && adminsExist === false && (
              <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full h-11 bg-muted/50 rounded-xl p-1 border border-border">
                  <TabsTrigger value="login" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm">Bootstrap</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </CardHeader>
          
          <CardContent className="px-8 pb-10">
            {isStuck ? (
              <div className="space-y-6">
                <div className="p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-center space-y-2">
                  <p className="text-[11px] text-amber-600/80 font-black uppercase tracking-widest leading-relaxed">
                    Identity Synchronized: <br/> {user.email}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter italic">
                    Waiting for Administrative Clearance
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button className="w-full h-14 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-primary/10" onClick={() => window.location.reload()}>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retry Link
                  </Button>
                  <Button variant="ghost" className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest text-muted-foreground" onClick={handleLogout}>
                    Reset Session
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Official Designation</Label>
                    <div className="relative group">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="Full Official Name" 
                        className="h-14 pl-12 bg-muted/20 border border-border focus:border-primary/30 rounded-2xl text-xs font-bold transition-all"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Terminal Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input 
                      type="email" 
                      placeholder="official@bureau.gov" 
                      className="h-14 pl-12 bg-muted/20 border border-border focus:border-primary/30 rounded-2xl text-xs font-bold transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Terminal Access Key</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-14 pl-12 bg-muted/20 border border-border focus:border-primary/30 rounded-2xl text-xs font-bold transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 mt-4 text-[11px]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : mode === 'login' ? (
                    "Initialize Session"
                  ) : (
                    "Register Admin"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          
          <CardFooter className="pt-0 pb-8 flex flex-col text-center opacity-40">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-border" />
              <p className="text-[8px] font-black uppercase tracking-[0.4em]">
                Security Audit Active
              </p>
              <div className="h-px w-8 bg-border" />
            </div>
            <p className="text-[7px] font-bold text-muted-foreground uppercase mt-2 tracking-widest">
              Protocol v4.2.0 • Encryption Enabled
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
