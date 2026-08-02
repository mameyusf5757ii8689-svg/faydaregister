
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
import { 
  Settings, 
  Image as ImageIcon, 
  Layout, 
  Loader2, 
  Save, 
  RefreshCcw, 
  Edit3, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  ShieldCheck,
  Globe
} from 'lucide-react';
import Image from 'next/image';
import { logAuditAction } from '@/lib/audit';
import { cn } from '@/lib/utils';

const DEFAULT_LOGO = "https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw";

export default function AdminSettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bureauName: '',
    logoUrl: '',
    contactEmail: '',
    contactPhone: '',
    officeAddress: '',
    operationalHours: '',
    systemProtocol: 'Protocol v4.2',
  });
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const brandingRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'system_settings', 'branding');
  }, [db]);
  const { data: branding, isLoading } = useDoc<SystemSettings>(brandingRef);

  useEffect(() => {
    if (branding) {
      setFormData({
        bureauName: branding.bureauName || 'FaydaTrack',
        logoUrl: branding.logoUrl || DEFAULT_LOGO,
        contactEmail: branding.contactEmail || '',
        contactPhone: branding.contactPhone || '',
        officeAddress: branding.officeAddress || '',
        operationalHours: branding.operationalHours || '',
        systemProtocol: branding.systemProtocol || 'Protocol v4.2',
      });
    }
  }, [branding]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !profile) return;

    setIsSaving(true);
    try {
      await setDocumentNonBlocking(doc(db, 'system_settings', 'branding'), {
        ...formData,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logAuditAction(
        db, 
        user, 
        profile.fullName,
        'BRANDING_UPDATE', 
        'branding', 
        `Global Identity Sync: Updated bureau settings for "${formData.bureauName}".`
      );

      toast({
        title: "Profile Synchronized",
        description: "Institutional branding and contact details updated globally.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Protocol error during identity synchronization.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      bureauName: 'FaydaTrack',
      logoUrl: DEFAULT_LOGO,
      contactEmail: 'support@fayda.com',
      contactPhone: '+251 11 000 0000',
      officeAddress: 'Addis Ababa, HQ',
      operationalHours: 'Mon-Fri, 8:30 AM - 5:30 PM',
      systemProtocol: 'Protocol v4.2',
    });
    toast({ title: "Defaults Restored", description: "Standard bureau configuration loaded." });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Bureau Administration</p>
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline uppercase leading-none">Branding Terminal</h1>
          <p className="text-sm text-muted-foreground">Manage the institutional identity, contact matrix, and system-wide protocols.</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/10">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-6 font-bold text-[10px] uppercase tracking-widest border-border bg-card">
               Discard Changes
            </Button>
            <Button onClick={handleSaveSettings} disabled={isSaving} className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/10">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Commit Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          {isEditing ? (
            <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-[32px]">
              <CardHeader className="bg-muted/30 border-b border-border p-8">
                <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" /> Configuration Mode
                </CardTitle>
                <CardDescription className="text-xs">Update institutional information fields below.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Bureau Designation</Label>
                      <Input name="bureauName" value={formData.bureauName} onChange={handleInputChange} className="h-12 rounded-xl bg-background border-border font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Logo URL Source</Label>
                      <Input name="logoUrl" value={formData.logoUrl} onChange={handleInputChange} className="h-12 rounded-xl bg-background border-border text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Contact Email</Label>
                      <Input name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} placeholder="official@bureau.gov" className="h-12 rounded-xl bg-background border-border font-medium" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Contact Phone</Label>
                      <Input name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} placeholder="+251 ..." className="h-12 rounded-xl bg-background border-border font-medium" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Office Address</Label>
                    <Input name="officeAddress" value={formData.officeAddress} onChange={handleInputChange} placeholder="Street, Building, City" className="h-12 rounded-xl bg-background border-border font-medium" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Operational Hours</Label>
                      <Input name="operationalHours" value={formData.operationalHours} onChange={handleInputChange} placeholder="Mon-Fri, 9:00 - 17:00" className="h-12 rounded-xl bg-background border-border font-medium" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">System Protocol</Label>
                      <Input name="systemProtocol" value={formData.systemProtocol} onChange={handleInputChange} className="h-12 rounded-xl bg-background border-border font-black text-primary uppercase text-[10px] tracking-widest" />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-start">
                    <Button type="button" variant="ghost" onClick={handleReset} className="font-bold text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all">
                       <RefreshCcw className="mr-2 h-3 w-3" /> Restore Laboratory Defaults
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
               <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-[32px]">
                  <CardHeader className="bg-primary/5 border-b border-border p-8">
                     <div className="flex items-center gap-6">
                        <div className="h-20 w-20 relative rounded-2xl overflow-hidden border-2 border-background shadow-2xl bg-white p-2 shrink-0">
                           <Image src={formData.logoUrl || DEFAULT_LOGO} alt="Bureau Logo" fill className="object-contain" unoptimized />
                        </div>
                        <div className="space-y-1">
                           <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">{formData.bureauName}</h2>
                           <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{formData.systemProtocol}</p>
                        </div>
                     </div>
                  </CardHeader>
                  <CardContent className="p-10 space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <InfoSection label="Contact Protocols" icon={Mail}>
                           <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-muted rounded-lg"><Mail className="h-3.5 w-3.5 text-muted-foreground" /></div>
                                 <p className="text-sm font-bold text-foreground">{formData.contactEmail || 'Not established'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-muted rounded-lg"><Phone className="h-3.5 w-3.5 text-muted-foreground" /></div>
                                 <p className="text-sm font-bold text-foreground">{formData.contactPhone || 'Not established'}</p>
                              </div>
                           </div>
                        </InfoSection>

                        <InfoSection label="Operational Hours" icon={Clock}>
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-muted rounded-lg"><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
                              <p className="text-sm font-bold text-foreground leading-relaxed">{formData.operationalHours || 'Operational 24/7 (Sync Enabled)'}</p>
                           </div>
                        </InfoSection>

                        <InfoSection label="Physical Deployment" icon={MapPin} className="md:col-span-2">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-muted rounded-lg"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /></div>
                              <p className="text-sm font-bold text-foreground">{formData.officeAddress || 'Global Distribution Network'}</p>
                           </div>
                        </InfoSection>
                     </div>

                     <div className="pt-10 border-t border-border border-dashed flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                              <ShieldCheck className="h-5 w-5 text-emerald-600" />
                           </div>
                           <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Profile Verified</p>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">Institutional Authenticity Guaranteed</p>
                           </div>
                        </div>
                        <span className="text-[8px] font-mono font-bold text-muted-foreground uppercase opacity-30">SID: branding_root_001</span>
                     </div>
                  </CardContent>
               </Card>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-8">
           <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-[32px]">
              <CardHeader className="bg-muted/30 border-b border-border py-4">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layout className="h-3 w-3" /> Digital Terminal Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-12">
                 {/* Navbar Preview */}
                 <div className="space-y-4">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Global Header Simulation</p>
                    <div className="h-14 w-full bg-background border border-border rounded-xl flex items-center px-4 justify-between shadow-inner">
                       <div className="flex items-center gap-2">
                          <div className="h-7 w-7 relative rounded bg-white p-1 border border-border">
                             <Image src={formData.logoUrl || DEFAULT_LOGO} alt="Logo" fill className="object-contain" unoptimized />
                          </div>
                          <span className="text-[9px] font-black tracking-widest uppercase text-foreground">{formData.bureauName}</span>
                       </div>
                       <div className="flex gap-2">
                          <div className="h-4 w-4 rounded-full bg-muted" />
                          <div className="h-4 w-8 rounded bg-muted" />
                       </div>
                    </div>
                 </div>

                 {/* Footer Preview */}
                 <div className="space-y-4">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Global Footer Simulation</p>
                    <div className="p-8 bg-muted/20 border border-border rounded-xl text-center space-y-4">
                        <div className="flex items-center justify-center gap-3 grayscale opacity-40">
                           <div className="h-6 w-6 relative">
                              <Image src={formData.logoUrl || DEFAULT_LOGO} alt="Logo" fill className="object-contain" unoptimized />
                           </div>
                           <span className="text-xs font-black tracking-[0.3em] uppercase">{formData.bureauName}</span>
                        </div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed">
                           {formData.officeAddress || 'Bureau Operational Zone'} <br/>
                           Contact: {formData.contactEmail || 'support@system.gov'}
                        </p>
                        <p className="text-[7px] font-bold text-muted-foreground uppercase opacity-40">
                           System Security Audit: <span className="text-emerald-500">Active</span> • {formData.systemProtocol}
                        </p>
                    </div>
                 </div>

                 <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                       <Globe className="h-24 w-24" />
                    </div>
                    <p className="text-[9px] text-amber-700 font-bold uppercase leading-relaxed tracking-[0.1em] relative z-10">
                       Changes committed to this terminal will propagate instantly across the Landing Page, Login Portal, and all internal Coordination Channels. Ensure asset sources (Logo URL) are highly available.
                    </p>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function InfoSection({ label, icon: Icon, children, className }: any) {
   return (
      <div className={cn("space-y-4", className)}>
         <div className="flex items-center gap-2 border-b border-border pb-2">
            <Icon className="h-3 w-3 text-primary" />
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</h3>
         </div>
         {children}
      </div>
   );
}
