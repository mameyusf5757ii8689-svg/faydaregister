
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  FileCheck, 
  ArrowRight, 
  Shield,
  Zap,
  Globe,
  Database,
  MessageSquare,
  Sparkles,
  Fingerprint
} from 'lucide-react';
import { useUser } from '@/firebase';
import Image from 'next/image';

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="flex flex-col min-h-screen -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 bg-background">
      {/* Professional Bureau Hero */}
      <section className="relative w-full py-32 lg:py-56 overflow-hidden border-b">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />
        
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-1000">
              <Shield className="h-3.5 w-3.5" />
              Unified Bureau Framework v4.0
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-8xl font-black tracking-tighter leading-[0.95] text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
                Fayda Intelligence. <br/>
                <span className="text-muted-foreground/40 font-medium italic">Precision Tracking.</span>
              </h1>
              
              <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                The high-fidelity terminal for official registration management, real-time coordination, and AI-assisted operational triage.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/20 active:scale-95 transition-all" asChild>
                <Link href={user ? "/dashboard" : "/login"}>
                  Initialize Terminal <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest px-6 py-3 rounded-2xl bg-muted/50 border border-border/50">
                  <Fingerprint className="h-3.5 w-3.5 opacity-50" />
                  Credentials Required
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Matrix */}
      <section className="w-full py-32 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 space-y-3">
             <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Operational Pillars</p>
             <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase">System Capabilities</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <InfoCard 
              title="Real-time Ledger" 
              description="Monitor 10,000+ bureau records with instant synchronization and multi-vector search protocols."
              icon={Database} 
            />
            <InfoCard 
              title="AI Status Triage" 
              description="Automated intelligence analyzes submission patterns to suggest optimal processing pathways."
              icon={Sparkles} 
            />
            <InfoCard 
              title="Secure Coordination" 
              description="Internal encrypted channels for regional response teams and cross-departmental coordination."
              icon={MessageSquare} 
            />
          </div>
        </div>
      </section>

      {/* Bureau Info Section */}
      <section className="w-full py-32 border-t">
        <div className="container mx-auto px-4">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                 <h2 className="text-4xl font-black tracking-tighter text-foreground leading-tight">
                    Engineered for <span className="text-primary italic">Absolute Accuracy.</span>
                 </h2>
                 <p className="text-muted-foreground leading-relaxed font-medium">
                    FaydaTrack serves as the central nervous system for regional registration bureaus. It eliminates operational latency by providing a unified interface for data entry, historical archiving, and performance analysis.
                 </p>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <p className="text-2xl font-black text-foreground tracking-tighter">99.9%</p>
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Uptime Target</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-2xl font-black text-foreground tracking-tighter">Instant</p>
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Data Sync</p>
                    </div>
                 </div>
              </div>
              <div className="relative aspect-video rounded-[32px] overflow-hidden border border-border shadow-2xl bg-muted group">
                 <Image 
                    src="https://picsum.photos/seed/bureau-hero/1200/800"
                    alt="Bureau Framework"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 grayscale hover:grayscale-0"
                    data-ai-hint="government office"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>
           </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="w-full py-20 border-t mt-auto bg-card/50">
        <div className="container mx-auto px-4 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-border/50 shadow-md">
              <Image 
                src="https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw"
                alt="FaydaTrack Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-sm font-black tracking-[0.3em] uppercase text-foreground">Fayda<span className="text-primary italic">Track</span></span>
          </div>
          <div className="space-y-4">
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest max-w-sm leading-relaxed mx-auto">
               Official Bureau Operations Group <br/> Security Audit: ACTIVE
             </p>
             <div className="flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                <span>Terms of Access</span>
                <span className="h-1 w-1 bg-muted-foreground/20 rounded-full" />
                <span>Protocol v4.1</span>
                <span className="h-1 w-1 bg-muted-foreground/20 rounded-full" />
                <span>2026 Registry</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function InfoCard({ title, description, icon: Icon }: any) {
  return (
    <div className="p-10 rounded-[32px] bg-background border border-border/50 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="mb-8 p-4 rounded-2xl bg-muted/50 w-fit border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
        <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={2.5} />
      </div>
      <div className="space-y-3 relative z-10">
        <h3 className="text-lg font-black text-foreground uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
