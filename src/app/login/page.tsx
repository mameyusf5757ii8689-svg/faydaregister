
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
import { FileCheck, Lock, UserCircle, Loader2, ShieldCheck, LogOut, Mail } from 'lucide-react';
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
          description: "Welcome to the bureau management system.",
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
    <div className="flex min-h-[80vh] items-center justify-center animate-in fade-in duration-1000 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent)] pointer-events-none" />
      
      <Card className="w-full max-w-md border-none shadow-2xl bg-card overflow-hidden rounded-[32px]">
        <div className="h-2 bg-primary" />
        
        <CardHeader className="space-y-6 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/10 relative overflow-hidden">
            <Image 
              src="https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw"
              alt="FaydaTrack Logo"
              fill
              className="object-cover p-2"
            />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-black tracking-tight text-foreground font-headline">Fayda Portal</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">
              {isStuck ? "Profile Required" : "Internal Access Control"}
            </CardDescription>
          </div>
          
          {!isStuck && adminsExist === false && (
            <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
              <TabsList className="grid grid-cols-2 w-full h-12 p-1.5 bg-muted rounded-xl">
                <TabsTrigger value="login" className="text-[10px] font-black uppercase rounded-lg">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-[10px] font-black uppercase rounded-lg">Bootstrap Admin</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          {isStuck ? (
            <div className="space-y-6 py-4">
              <div className="p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <div className="flex gap-3 items-start">
                  <div className="mt-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <p className="text-xs text-amber-600 font-medium leading-relaxed">
                    Authenticated as <span className="font-bold underline">{user.email}</span>, but your bureau profile is not yet active. Please retry or restart.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button className="w-full h-12 rounded-xl font-bold bg-primary" onClick={() => window.location.reload()}>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retry Connection
                </Button>
                <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-red-500 hover:bg-red-500/10" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Restart Session
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Full Name</Label>
                  <div className="relative group">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Bureau Official Name" 
                      className="pl-12 h-12 border-border bg-muted/30 focus:bg-background rounded-xl transition-all"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Email Terminal</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="official@bureau.gov" 
                    className="pl-12 h-12 border-border bg-muted/30 focus:bg-background rounded-xl transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Access Key</Label>
                  {mode === 'login' && <button type="button" className="text-[10px] font-black uppercase text-primary hover:underline">Request Reset</button>}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-12 h-12 border-border bg-muted/30 focus:bg-background rounded-xl transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl transition-all shadow-xl shadow-primary/5 mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Handshaking...</>
                ) : mode === 'login' ? (
                  "Secure Sign In"
                ) : (
                  <><ShieldCheck className="mr-2 h-5 w-5" /> Initialize Admin</>
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col border-t border-border bg-muted/20 p-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
             <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
             <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
             <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase tracking-tighter max-w-[240px] mx-auto">
            This system is for authorized personnel only. Monitoring is in effect.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
