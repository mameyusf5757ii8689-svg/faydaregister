"use client"

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { 
  UserCircle, 
  MapPin, 
  Layers, 
  ShieldCheck, 
  Mail, 
  Save, 
  Loader2, 
  Camera,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  region: z.string().min(1, "Region is required"),
  cluster: z.string().min(1, "Cluster is required"),
  profilePhoto: z.string().url("Must be a valid image URL").optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      region: '',
      cluster: '',
      profilePhoto: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName || '',
        region: profile.region || '',
        cluster: profile.cluster || '',
        profilePhoto: profile.profilePhoto || '',
      });
    }
  }, [profile, form]);

  async function onSubmit(values: ProfileFormValues) {
    if (!db || !user) return;
    setIsSaving(true);

    try {
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        ...values,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Profile Synchronized",
        description: "Your official bureau record has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not establish a connection to the profile service.",
      });
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  }

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Accessing Profile Data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <Link href="/dashboard" className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="mr-2 h-3 w-3" /> Return to Command Center
      </Link>

      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Official Settings</p>
        <h1 className="text-3xl font-black tracking-tight text-foreground font-headline">Bureau Identity</h1>
        <p className="text-sm text-muted-foreground">Manage your personal credentials and operational sector assignments.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                    <AvatarImage src={form.watch('profilePhoto') || profile?.profilePhoto} />
                    <AvatarFallback className="text-xl font-black bg-primary/10 text-primary">
                      {profile?.fullName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-xl font-bold text-foreground">{profile?.fullName}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter">
                      {profile?.role}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-tighter">
                      UID: {user?.uid.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                          <Input {...field} className="pl-10 h-12 bg-background border-border rounded-xl" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Terminal</FormLabel>
                  <div className="relative group opacity-50">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                    <Input value={profile?.email} disabled className="pl-10 h-12 bg-muted border-border rounded-xl cursor-not-allowed" />
                  </div>
                  <FormDescription className="text-[10px] font-medium">Auth credentials managed by headquarters.</FormDescription>
                </FormItem>

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operational Region</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                          <Input {...field} className="pl-10 h-12 bg-background border-border rounded-xl" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cluster"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assigned Cluster</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                          <Input {...field} className="pl-10 h-12 bg-background border-border rounded-xl" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="profilePhoto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Profile Photo URL</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                        <Input {...field} placeholder="https://images.unsplash.com/..." className="pl-10 h-12 bg-background border-border rounded-xl" />
                      </div>
                    </FormControl>
                    <FormDescription className="text-[10px] font-medium">Remote image source for your identification badge.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4 p-6 bg-primary/[0.03] border border-primary/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="text-xs font-bold text-foreground">Personnel Verification Required</p>
            </div>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/10"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Synchronizing...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Commit Changes</>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
