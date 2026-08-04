
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Database, 
  MessageSquare, 
  Sparkles, 
  Fingerprint, 
  ShieldCheck, 
  LayoutGrid, 
  Mail, 
  Phone, 
  MapPin,
  Activity,
  Timer,
  Activity as ActivityIcon
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { SystemSettings } from '@/lib/types';

const DEFAULT_LOGO = "https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw";

export default function LandingPage() {
  const { user } = useUser();
  const db = useFirestore();

  const brandingRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'system_settings', 'branding');
  }, [db]);
  const { data: branding } = useDoc<SystemSettings>(brandingRef);

  const bureauName = branding?.bureauName || 'FaydaTrack';
  const logoUrl = branding?.logoUrl || DEFAULT_LOGO;
  const systemProtocol = branding?.systemProtocol || 'Protocol v4.2';

  return (
    <div className="flex flex-col min-h-screen -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 bg-background selection:bg-primary/20">
      {/* Cinematic Bureau Hero */}
      <section className="relative w-full py-20 lg:py-48 overflow-hidden border-b bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/[0.03] rounded-full blur-[160px] -mr-96 -mt-96 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-[140px] -ml-64 -mb-64 pointer-events-none" />
        
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center space-y-8 md:space-y-12">
            <div className="inline-flex items-center gap-2.5 px-4 md:px-5 py-2 rounded-full bg-background border border-border shadow-xl shadow-primary/5">
              <div className="flex items-center gap-1.5">
                 <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                 <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-foreground">{systemProtocol} Active</span>
              </div>
              <div className="h-4 w-px bg-border mx-1" />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                 <Shield className="h-3 w-3 md:h-3.5 md:w-3.5" />
                 <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Verified Hub</span>
              </div>
            </div>
            
            <div className="space-y-6 md:space-y-8">
              <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[110px] font-black tracking-tighter leading-[0.9] md:leading-[0.85] text-foreground">
                Official {bureauName.split('Track')[0]} <br/>
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/40 bg-clip-text text-transparent italic font-medium">Intelligence.</span>
              </h1>
              
              <p className="text-base md:text-xl lg:text-2xl text-muted-foreground/80 max-w-3xl mx-auto font-medium leading-relaxed tracking-tight px-4">
                The high-fidelity terminal for institutional registration tracking, real-time field coordination, and automated operational triage.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 pt-4">
              <Button size="lg" className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-12 text-[11px] md:text-[12px] font-black uppercase tracking-[0.25em] rounded-2xl shadow-[0_20px_50px_rgba(var(--primary),0.3)]" asChild>
                <Link href={user ? "/dashboard" : "/login"}>
                  Initialize Terminal <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <div className="flex items-center gap-3 text-[10px] md:text-[11px] text-muted-foreground font-black uppercase tracking-widest px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-muted/30 border border-border/40 backdrop-blur-sm">
                  <Fingerprint className="h-4 w-4 opacity-50" />
                  Personnel Only
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Matrix */}
      <section className="w-full py-20 lg:py-40 bg-muted/10 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center mb-16 md:mb-24 space-y-4">
             <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-2">
                <LayoutGrid className="h-5 w-5 md:h-6 md:w-6 text-primary" />
             </div>
             <p className="text-[10px] md:text-[11px] font-black text-primary uppercase tracking-[0.4em]">Operational Pillars</p>
             <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">System Architecture</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            <InfoCard 
              title="Real-time Ledger" 
              description="Monitor 10,000+ bureau records with instant synchronization and multi-vector search protocols."
              icon={Database} 
              index={0}
            />
            <InfoCard 
              title="AI Status Triage" 
              description="Automated intelligence analyzes submission patterns to suggest optimal processing pathways."
              icon={Sparkles} 
              index={1}
            />
            <InfoCard 
              title="Secure Coordination" 
              description="Internal encrypted channels for regional response teams and cross-departmental coordination."
              icon={MessageSquare} 
              index={2}
            />
          </div>
        </div>
      </section>

      {/* Bureau Accuracy Section */}
      <section className="w-full py-20 lg:py-40 border-t relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div className="space-y-8 md:space-y-10 order-2 lg:order-1">
                 <div className="space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-[0.95]">
                       Engineered for <br/>
                       <span className="text-primary italic">Absolute Accuracy.</span>
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium tracking-tight">
                       {bureauName} serves as the central nervous system for regional registration bureaus, eliminating latency through unified data entry and historical archiving.
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                    <StatBox label="Uptime Target" value="99.9%" icon={ShieldCheck} />
                    <StatBox label="Sync Latency" value="< 1.0s" icon={Zap} />
                 </div>

                 <div className="pt-4">
                    <Button variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest border-border hover:bg-muted" asChild>
                       <Link href="/full-registration">Review Bureau Performance</Link>
                    </Button>
                 </div>
              </div>

              <div className="relative order-1 lg:order-2 px-4 md:px-0">
                <div className="absolute inset-0 bg-primary/20 rounded-[40px] blur-3xl opacity-20 -rotate-6 animate-pulse" />
                <div className="relative aspect-square md:aspect-video rounded-[40px] overflow-hidden border border-border shadow-2xl bg-card group p-8 md:p-16 flex items-center justify-center transition-transform duration-700 hover:scale-[1.02]">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/[0.03] to-transparent pointer-events-none" />
                   <div className="relative h-full w-full">
                     <Image 
                        src={logoUrl}
                        alt="Accuracy Logo"
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain p-4 md:p-12 transition-all duration-1000 group-hover:scale-110"
                        unoptimized
                     />
                   </div>
                   <div className="absolute top-4 md:top-8 left-4 md:left-8 h-3 w-3 md:h-4 md:w-4 border-t-2 border-l-2 border-primary/20" />
                   <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 h-3 w-3 md:h-4 md:w-4 border-b-2 border-r-2 border-primary/20" />
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* Final Institutional CTA */}
      <section className="w-full py-20 md:py-40 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center space-y-10 md:space-y-12">
           <div className="space-y-4">
              <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase">Ready for Field Deployment?</h2>
              <p className="text-sm md:text-lg text-muted-foreground max-w-xl mx-auto font-medium">Initialize your official terminal session and begin secure operations.</p>
           </div>
           <Button size="lg" variant="secondary" className="w-full sm:w-auto h-16 px-12 text-[12px] font-black uppercase tracking-widest rounded-2xl bg-background text-foreground hover:bg-background/90" asChild>
              <Link href={user ? "/dashboard" : "/login"}>Enter Terminal Hub</Link>
           </Button>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="w-full py-16 md:py-24 border-t mt-auto bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start mb-12 md:mb-16">
            <div className="space-y-6 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-4">
                <div className="relative h-10 w-10 md:h-12 md:w-12 overflow-hidden rounded-2xl border border-border shadow-xl">
                  <Image src={logoUrl} alt="Logo" fill sizes="48px" className="object-contain" unoptimized />
                </div>
                <span className="text-base md:text-lg font-black tracking-widest uppercase text-foreground">
                  {bureauName.split('Track')[0]}<span className="text-primary italic">{bureauName.includes('Track') ? 'Track' : ''}</span>
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-muted-foreground font-black uppercase tracking-[0.2em] max-w-xs leading-relaxed">
                Official {bureauName} Operations Group. Secure and accountability-driven registration management.
              </p>
            </div>

            <div className="space-y-4 flex flex-col items-center text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Operational Hub</p>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-[10px] md:text-[11px] text-muted-foreground font-bold">
                    <MapPin className="h-3.5 w-3.5 text-primary/40" />
                    {branding?.officeAddress || 'Regional Headquarters'}
                 </div>
                 <div className="flex items-center gap-3 text-[10px] md:text-[11px] text-muted-foreground font-bold">
                    <ActivityIcon className="h-3.5 w-3.5 text-primary/40" />
                    {branding?.operationalHours || 'Operational 24/7'}
                 </div>
              </div>
            </div>

            <div className="space-y-4 flex flex-col items-center md:items-end text-center md:text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Support Protocols</p>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-[10px] md:text-[11px] text-muted-foreground font-bold justify-center md:justify-end">
                    <Mail className="h-3.5 w-3.5 text-primary/40" />
                    {branding?.contactEmail || 'support@bureau.gov'}
                 </div>
                 <div className="flex items-center gap-3 text-[10px] md:text-[11px] text-muted-foreground font-bold justify-center md:justify-end">
                    <Phone className="h-3.5 w-3.5 text-primary/40" />
                    {branding?.contactPhone || '+251 ...'}
                 </div>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-6">
             <p className="text-[8px] md:text-[9px] text-muted-foreground font-black uppercase tracking-[0.3em] text-center">
               Security Audit: <span className="text-emerald-500">ACTIVE</span> • System {systemProtocol}
             </p>
             <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                <a href="#" className="hover:text-primary transition-colors">Terms</a>
                <span className="h-1 w-1 bg-border rounded-full" />
                <a href="#" className="hover:text-primary transition-colors">Audit</a>
                <span className="h-1 w-1 bg-border rounded-full" />
                <span>© 2026 Registry</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function InfoCard({ title, description, icon: Icon, index }: any) {
  return (
    <div 
      className="p-8 md:p-12 rounded-[32px] md:rounded-[40px] bg-card border border-border shadow-sm transition-all duration-500 hover:shadow-2xl group relative overflow-hidden"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-primary/[0.02] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="mb-8 md:mb-10 p-4 md:p-5 rounded-[20px] bg-muted/50 w-fit border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-500">
        <Icon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={2.5} />
      </div>
      <div className="space-y-3 md:space-y-4 relative z-10">
        <h3 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tight">{title}</h3>
        <p className="text-sm md:text-base text-muted-foreground font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-4 md:gap-5 p-4 md:p-6 rounded-2xl bg-muted/30 border border-border/50 group transition-all hover:bg-card">
      <div className="p-2.5 md:p-3 bg-background rounded-xl border border-border group-hover:border-primary/20 group-hover:shadow-lg transition-all">
        <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
      </div>
      <div className="space-y-0.5">
         <p className="text-2xl md:text-3xl font-black text-foreground tracking-tighter">{value}</p>
         <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</p>
      </div>
    </div>
  );
}
