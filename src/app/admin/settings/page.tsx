
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { SystemSettings, UserProfile } from '@/lib/types';
import { Settings, Image as ImageIcon, Layout, Loader2, Save, RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import { logAuditAction } from '@/lib/audit';

const DEFAULT_LOGO = "https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw";

export default function AdminSettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [bureauName, setBureauName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const brandingRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'system_settings', 'branding');
  }, [db]);
  const { data: branding, isLoading } = useDoc<SystemSettings>(brandingRef);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (branding) {
      setBureauName(branding.bureauName || 'FaydaTrack');
      setLogoUrl(branding.logoUrl || DEFAULT_LOGO);
    }
  }, [branding]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    setIsSaving(true);
    try {
      await setDocumentNonBlocking(doc(db, 'system_settings', 'branding'), {
        bureauName,
        logoUrl,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logAuditAction(db, user, 'BRANDING_UPDATE', 'branding', `Updated bureau name to ${bureauName} and modified logo source.`);

      toast({
        title: "Settings Updated",
        description: "Institutional branding has been synchronized across all terminals.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description: "Could not establish a secure connection to save settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setBureauName('FaydaTrack');
    setLogoUrl(DEFAULT_LOGO);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Bureau Administration</p>
        <h1 className="text-3xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Branding Terminal</h1>
        <p className="text-sm text-muted-foreground">Modify global institutional identity and visual protocol.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Identity Configuration
              </CardTitle>
              <CardDescription className="text-xs">Update your bureau's name and official logo source.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSaveSettings} className="space-y-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider ml-1">Bureau Designation</Label>
                    <Input 
                      value={bureauName}
                      onChange={(e) => setBureauName(e.target.value)}
                      placeholder="e.g. Oromia Registration Bureau"
                      className="h-12 bg-background border-border rounded-xl font-bold text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider ml-1">Official Logo Source (URL)</Label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                      <Input 
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-12 pl-10 bg-background border-border rounded-xl text-xs font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button type="submit" disabled={isSaving} className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/10">
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Committing...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset} className="h-12 px-6 border-border font-bold text-[10px] uppercase tracking-widest">
                    <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Restore Defaults
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Layout className="h-3 w-3" /> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-border shadow-2xl bg-white p-2">
                <Image 
                  src={logoUrl || DEFAULT_LOGO} 
                  alt="Logo Preview" 
                  fill 
                  className="object-contain p-2"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-foreground tracking-tight">{bureauName || 'FaydaTrack'}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Terminal Header</p>
              </div>
              <div className="w-full h-px bg-border border-dashed" />
              <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                Changes will be reflected on the Landing Page, Login Portal, Navigation Terminal, and Footer immediately after commit.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
