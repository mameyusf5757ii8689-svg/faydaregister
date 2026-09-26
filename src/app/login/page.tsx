
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
import { 
  Lock, 
  UserCircle, 
  Loader2, 
  ShieldCheck, 
  LogOut, 
  Mail, 
  Fingerprint, 
  ChevronRight, 
  Shield,
  Eye,
  EyeOff,
  Activity,
  Key,
  Smartphone,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, collection, query, limit } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile, SystemSettings } from '@/lib/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import * as OTPAuth from "otpauth";
import { QRCodeSVG } from 'qrcode.react';

const DEFAULT_LOGO = "https://services.eaes.et/NID-Logos/Fayda%20For%20Ethiopia%20logo-%20english-2-01.png";

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'otp-setup'>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminsExist, setAdminsExist] = useState<boolean | null>(null);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState('');
  
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const brandingRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'system_settings', 'branding');
  }, [db]);
  const { data: branding } = useDoc<SystemSettings>(brandingRef);

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
        if (mode === 'register') setMode('login');
      } else if (adminsExist === null) {
        setMode('register');
      }
    }
  }, [adminDocs, adminsExist, mode]);

  // MANDATORY SECURITY GATE EFFECT
  useEffect(() => {
    if (isUserLoading || isProfileLoading || !user || !profile) return;

    // MANDATORY MFA FOR ALL USERS (ADMIN & REVIEWER)
    const isMfaRequired = true; 

    if (isMfaRequired && !isOtpVerified) {
      if (profile.twoFactorSecret) {
        // Protocol A: Known Secret -> Challenge Mode
        if (mode !== 'otp') setMode('otp');
      } else {
        // Protocol B: No Secret -> Setup Mode
        if (mode !== 'otp-setup') setMode('otp-setup');
        if (!generatedSecret) {
          const secret = new OTPAuth.Secret({ size: 20 }).base32;
          setGeneratedSecret(secret);
        }
      }
      return; // HALT REDIRECTION
    }

    // Clear to proceed to authorized dashboard
    if (profile.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  }, [user, profile, isUserLoading, isProfileLoading, router, isOtpVerified, generatedSecret, mode]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.twoFactorSecret || !otpCode) return;

    setIsSubmitting(true);
    
    try {
      const totp = new OTPAuth.TOTP({
        secret: profile.twoFactorSecret,
      });

      const delta = totp.validate({
        token: otpCode,
        window: 1
      });

      if (delta !== null) {
        toast({ 
          title: "Identity Verified", 
          description: "MFA protocol satisfied. Accessing terminal...",
          className: "bg-emerald-50 border-emerald-200 text-emerald-800"
        });
        setIsOtpVerified(true);
      } else {
        toast({ title: "Verification Failed", description: "Invalid OTP code. Please try again.", variant: "destructive" });
        setOtpCode('');
      }
    } catch (err) {
      toast({ title: "System Error", description: "Could not verify code.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleOtpSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !user || !db) return;

    setIsSubmitting(true);
    
    try {
      const totp = new OTPAuth.TOTP({
        secret: generatedSecret,
      });

      const delta = totp.validate({
        token: otpCode,
        window: 1
      });

      if (delta !== null) {
        await setDocumentNonBlocking(doc(db, 'users', user.uid), {
          twoFactorSecret: generatedSecret,
          twoFactorEnabled: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        toast({ 
          title: "MFA Active", 
          description: "MFA handshake established. Your account is now secured.",
          className: "bg-emerald-50 border-emerald-200 text-emerald-800"
        });
        setIsOtpVerified(true);
      } else {
        toast({ title: "Setup Failed", description: "Invalid code. Ensure your device clock is synced.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Setup Error", description: "Verification protocol failed.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (mode === 'login') {
        initiateEmailSignIn(auth, email, password);
      } else if (mode === 'register') {
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
          twoFactorEnabled: true,
          twoFactorSecret: '', 
        };

        await setDocumentNonBlocking(doc(db, 'users', uid), profileData, { merge: true });
        await setDocumentNonBlocking(doc(db, 'admin_users', uid), { active: true }, { merge: true });

        toast({
          title: "Admin Created",
          description: "Credential accepted. Proceeding to security setup.",
        });
      }
    } catch (error: any) {
      toast({
        title: mode === 'login' ? "Access Denied" : "Initialization Failed",
        description: error.message || "Credential validation error.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const isInitializing = isUserLoading || isAdminCheckLoading || (user && isProfileLoading && mode !== 'otp-setup' && mode !== 'otp');
  const bureauName = branding?.bureauName || 'FaydaTrack';
  const logoUrl = branding?.logoUrl || DEFAULT_LOGO;

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10 opacity-40" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">Gateway Handshake...</p>
        </div>
      </div>
    );
  }

  // OTP SETUP VIEW
  if (mode === 'otp-setup') {
    const totpSetup = new OTPAuth.TOTP({
      issuer: bureauName,
      label: email || profile?.email || 'official',
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: generatedSecret,
    });
    const otpauthUrl = totpSetup.toString();

    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <div className="relative z-10 w-full max-w-[420px] animate-in zoom-in-95 duration-500">
          <Card className="border border-border shadow-2xl bg-card rounded-[32px] overflow-hidden">
            <CardHeader className="text-center pt-10 px-8">
               <div className="mx-auto bg-primary/10 p-3 rounded-2xl w-fit mb-4">
                  <Smartphone className="h-8 w-8 text-primary" />
               </div>
               <CardTitle className="text-2xl font-black uppercase tracking-tight">Security Protocol</CardTitle>
               <CardDescription className="text-xs font-medium">Link your Google Authenticator app to establish terminal access.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-10 space-y-8">
               <div className="flex justify-center p-4 bg-white rounded-2xl border-4 border-white shadow-xl">
                  <QRCodeSVG value={otpauthUrl} size={180} />
               </div>
               <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-2">
                     <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest text-center">Manual Entry Key</p>
                     <div className="flex items-center justify-center gap-2">
                        <code className="text-xs font-black tracking-widest text-primary">{generatedSecret}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(generatedSecret); toast({ title: "Copied", description: "Secret copied to clipboard." }); }}>
                           <Copy className="h-3 w-3" />
                        </Button>
                     </div>
                  </div>
                  <form onSubmit={handleOtpSetupSubmit} className="space-y-4">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmation Code</Label>
                        <Input 
                          placeholder="000000" 
                          className="h-14 text-center text-2xl font-black tracking-[0.5em] bg-muted/20 border-border rounded-2xl" 
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          maxLength={6}
                          required
                        />
                     </div>
                     <Button type="submit" disabled={isSubmitting || otpCode.length !== 6} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20">
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Finalize Handshake'}
                     </Button>
                  </form>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // OTP CHALLENGE VIEW
  if (mode === 'otp') {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <div className="relative z-10 w-full max-w-[400px] animate-in slide-in-from-bottom-4 duration-500">
           <Card className="border border-border shadow-2xl bg-card rounded-[32px] overflow-hidden">
              <CardHeader className="text-center pt-10 px-8">
                 <div className="mx-auto bg-primary/10 p-3 rounded-2xl w-fit mb-4">
                    <Fingerprint className="h-8 w-8 text-primary" />
                 </div>
                 <CardTitle className="text-2xl font-black uppercase tracking-tight">Identity Gateway</CardTitle>
                 <CardDescription className="text-xs font-medium italic">Authorized MFA Verification Required</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-10">
                 <form onSubmit={handleOtpVerify} className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center block w-full">Google Authenticator Code</Label>
                       <Input 
                         placeholder="••••••" 
                         className="h-16 text-center text-3xl font-black tracking-[0.3em] bg-muted/20 border-border rounded-2xl focus:border-primary/50" 
                         value={otpCode}
                         onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                         maxLength={6}
                         autoFocus
                         required
                       />
                    </div>
                    <Button type="submit" disabled={isSubmitting || otpCode.length !== 6} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20">
                       {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Access'}
                    </Button>
                    <Button variant="ghost" onClick={handleLogout} className="w-full h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                       Abort Session
                    </Button>
                 </form>
              </CardContent>
           </Card>
        </div>
      </div>
    );
  }

  const isStuck = user && !profile && !isProfileLoading && !isAdminCheckLoading;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Card className="border border-border shadow-2xl bg-card rounded-[32px] overflow-hidden">
          <CardHeader className="space-y-8 text-center pt-10 pb-8 px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 p-4">
              <Image 
                src={logoUrl}
                alt={`${bureauName} Logo`}
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black tracking-tighter text-foreground uppercase leading-none">
                {bureauName.split('Track')[0]} <span className="text-primary italic">Terminal</span>
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
                  <Button className="w-full h-14 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em]" onClick={() => window.location.reload()}>
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
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-500">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Official Designation</Label>
                    <div className="relative group">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="Full Official Name" 
                        className="h-14 pl-12 bg-muted/20 border border-border focus:border-primary/30 rounded-2xl text-xs font-bold"
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
                      className="h-14 pl-12 bg-muted/20 border border-border focus:border-primary/30 rounded-2xl text-xs font-bold"
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
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      className="h-14 pl-12 pr-12 bg-muted/20 border border-border focus:border-primary/30 rounded-2xl text-xs font-bold"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-primary/20 transition-all active:scale-95 mt-4 text-[11px]"
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
              <p className="text-[8px] font-black uppercase tracking(0.4em]">
                Multi-Factor Security Active
              </p>
              <div className="h-px w-8 bg-border" />
            </div>
            <p className="text-[7px] font-bold text-muted-foreground uppercase mt-2 tracking-widest">
              Google Authenticator Protocol Enabled
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
