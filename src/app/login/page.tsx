
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
import { Lock, UserCircle, Loader2, ShieldCheck, LogOut, Mail, Fingerprint, ChevronRight } from 'lucide-react';
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
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Initializing Secure Session</p>
        </div>
      </div>
    );
  }

  const isStuck = user && !profile && !isProfileLoading && !isAdminCheckLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Minimal technical background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] opacity-40" />
        </div>
      </div>

      <Card className="w-full max-w-sm border border-border/40 bg-card/40 backdrop-blur-md shadow-2xl rounded-[32px] overflow-hidden z-10 transition-all duration-500">
        <CardHeader className="space-y-6 pt-12 text-center pb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-background border border-border/50 shadow-sm p-3 hover:scale-105 transition-transform duration-300">
            <Image 
              src="https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw"
              alt="FaydaTrack Logo"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground font-headline">
              Fayda<span className="text-primary italic">Track</span>
            </CardTitle>
            <CardDescription className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <Fingerprint className="h-3 w-3" />
              Authorized Access Protocol
            </CardDescription>
          </div>
          
          {!isStuck && adminsExist === false && (
            <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full pt-2">
              <TabsList className="grid grid-cols-2 w-full h-10 p-1 bg-muted/30 rounded-xl border border-border/30">
                <TabsTrigger value="login" className="text-[10px] font-bold uppercase rounded-lg">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-[10px] font-bold uppercase rounded-lg">Bootstrap</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        
        <CardContent className="px-8 pb-10">
          {isStuck ? (
            <div className="space-y-6">
              <div className="p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                <p className="text-[10px] text-amber-600/80 font-bold leading-relaxed uppercase tracking-wide text-center">
                  Terminal identified as <span className="text-amber-700 underline decoration-dotted">{user.email}</span>. <br/> Profile is currently pending activation.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="w-full h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90" onClick={() => window.location.reload()}>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sync Gateway
                </Button>
                <Button variant="ghost" className="w-full h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest text-muted-foreground" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Reset Portal
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 ml-1">Official Full Name</Label>
                  <Input 
                    placeholder="E.g. Official Name" 
                    className="h-11 bg-background border-border/40 focus:border-primary/40 rounded-xl transition-all"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[9px] font-bold uppercase text-muted-foreground/60 ml-1">Bureau Email</Label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="official@faydatrack.gov" 
                  className="h-11 bg-background border-border/40 focus:border-primary/40 rounded-xl transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[9px] font-bold uppercase text-muted-foreground/60">Access Key</Label>
                  {mode === 'login' && <button type="button" className="text-[9px] font-bold uppercase text-primary/60 hover:text-primary transition-colors">Recover</button>}
                </div>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  className="h-11 bg-background border-border/40 focus:border-primary/40 rounded-xl transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest rounded-xl transition-all mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'login' ? (
                  <>Initiate Session <ChevronRight className="ml-1.5 h-3 w-3" /></>
                ) : (
                  "Initialize Admin"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col border-t border-border/30 bg-muted/5 p-8 text-center">
          <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest leading-relaxed">
            Secure Bureau Terminal v4.2.0 <br/> Operational Monitoring Active
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

