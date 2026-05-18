
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
import { Lock, UserCircle, Loader2, ShieldCheck, LogOut, Mail, Fingerprint } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, collection, query, limit } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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

        setDocumentNonBlocking(doc(db, 'users', uid), profileData, { merge: true });
        setDocumentNonBlocking(doc(db, 'admin_users', uid), { active: true }, { merge: true });

        toast({
          title: "Admin Account Created",
          description: "Welcome to the FaydaTrack bureau management system.",
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
        title: mode === 'login' ? "Login Failed" : "Registration Failed",
        description: error.message || "Please check your credentials.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const isInitializing = isUserLoading || isAdminCheckLoading;

  if (isInitializing && !user) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Authenticating Terminal</p>
        </div>
      </div>
    );
  }

  const isStuck = user && !profile && !isProfileLoading && !isAdminCheckLoading;

  return (
    <div className="flex min-h-[85vh] items-center justify-center animate-in fade-in duration-1000 px-4 relative overflow-hidden">
      {/* Decorative Bureau Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <Card className="w-full max-w-[420px] border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] bg-card/80 backdrop-blur-xl overflow-hidden rounded-[40px] z-10">
        <div className="h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        
        <CardHeader className="space-y-6 pt-12 text-center pb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 relative overflow-hidden p-3 group transition-transform hover:scale-105">
            <Image 
              src="https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw"
              alt="FaydaTrack Logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          
          <div className="space-y-1.5">
            <CardTitle className="text-4xl font-black tracking-tighter text-foreground font-headline">Fayda<span className="text-primary italic">Track</span></CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[9px] tracking-[0.3em] flex items-center justify-center gap-2">
              <Fingerprint className="h-3 w-3 opacity-40" />
              {isStuck ? "Registration Required" : "Authorized Access Only"}
            </CardDescription>
          </div>
          
          {!isStuck && adminsExist === false && (
            <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full pt-4">
              <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-muted/50 rounded-2xl border border-border/50">
                <TabsTrigger value="login" className="text-[10px] font-black uppercase rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-[10px] font-black uppercase rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Bootstrap</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        
        <CardContent className="px-10 pb-10">
          {isStuck ? (
            <div className="space-y-6 py-2">
              <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <p className="text-[11px] text-amber-600/80 font-bold leading-relaxed uppercase tracking-tighter">
                    Terminal connected as <span className="text-amber-600 underline decoration-dotted">{user.email}</span>, but your bureau profile is currently inactive. Contact your supervisor.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10" onClick={() => window.location.reload()}>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sync Credentials
                </Button>
                <Button variant="ghost" className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/5" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Reset Terminal
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1.5 opacity-60">Full Name</Label>
                  <div className="relative group">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Official Bureau Name" 
                      className="pl-12 h-14 border-border/50 bg-muted/20 focus:bg-background rounded-2xl transition-all shadow-sm focus:ring-4 focus:ring-primary/5"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1.5 opacity-60">Bureau Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="official@fayda.gov" 
                    className="pl-12 h-14 border-border/50 bg-muted/20 focus:bg-background rounded-2xl transition-all shadow-sm focus:ring-4 focus:ring-primary/5"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1.5">
                  <Label htmlFor="password" className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Access Key</Label>
                  {mode === 'login' && <button type="button" className="text-[9px] font-black uppercase text-primary/60 hover:text-primary hover:underline transition-colors">Recover</button>}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-12 h-14 border-border/50 bg-muted/20 focus:bg-background rounded-2xl transition-all shadow-sm focus:ring-4 focus:ring-primary/5"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-primary/20 mt-6 active:scale-95"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying</>
                ) : mode === 'login' ? (
                  "Initiate Session"
                ) : (
                  "Initialize Admin"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col border-t border-border/40 bg-muted/10 p-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
             <div className="h-1 w-1 rounded-full bg-primary/20" />
             <div className="h-1 w-1 rounded-full bg-primary/40" />
             <div className="h-1 w-1 rounded-full bg-primary/20" />
          </div>
          <p className="text-[9px] text-muted-foreground font-bold leading-relaxed uppercase tracking-widest max-w-[280px] mx-auto opacity-50">
            Secure Bureau Terminal v4.1.0 <br/> Operational Monitoring is Active
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
