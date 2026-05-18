
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
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Gateway Authentication</p>
        </div>
      </div>
    );
  }

  const isStuck = user && !profile && !isProfileLoading && !isAdminCheckLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-none shadow-none bg-transparent">
        <CardHeader className="space-y-6 text-center pb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30 p-3">
            <Image 
              src="https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw"
              alt="FaydaTrack Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tighter text-foreground uppercase">
              Fayda<span className="text-primary italic">Track</span>
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              Authorized Personnel Terminal
            </CardDescription>
          </div>
          
          {!isStuck && adminsExist === false && (
            <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
              <TabsList className="grid grid-cols-2 w-full h-10 bg-muted/50 rounded-xl p-1">
                <TabsTrigger value="login" className="text-[9px] font-black uppercase">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-[9px] font-black uppercase">Bootstrap</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        
        <CardContent className="px-4">
          {isStuck ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 text-center">
                <p className="text-[10px] text-amber-600/80 font-black uppercase tracking-widest leading-relaxed">
                  Terminal Identified: {user.email} <br/> Profile Pending Clearance.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={() => window.location.reload()}>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retry Connection
                </Button>
                <Button variant="ghost" className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest text-muted-foreground" onClick={handleLogout}>
                  Reset Session
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1">
                  <Input 
                    placeholder="Official Name" 
                    className="h-11 bg-muted/20 border-none rounded-xl text-xs font-bold"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <Input 
                  type="email" 
                  placeholder="Official Email" 
                  className="h-11 bg-muted/20 border-none rounded-xl text-xs font-bold"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-1">
                <Input 
                  type="password" 
                  placeholder="Access Key" 
                  className="h-11 bg-muted/20 border-none rounded-xl text-xs font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] rounded-xl transition-all mt-2 text-[10px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'login' ? (
                  "Initiate Session"
                ) : (
                  "Initialize Admin"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="pt-10 flex flex-col text-center opacity-30">
          <p className="text-[8px] font-black uppercase tracking-[0.3em]">
            Security Audit: Active • v4.2.0
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
