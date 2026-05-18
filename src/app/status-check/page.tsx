
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Search, Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StatusCheckPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      <Link href="/dashboard" className="flex items-center text-[10px] font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest gap-1.5">
        <ArrowLeft className="h-3 w-3" /> Return to Command
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground font-headline uppercase">External Status Terminal</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Authorized Official Verification Portal</p>
          </div>
        </div>
      </div>

      <Card className="border border-border shadow-2xl bg-card overflow-hidden rounded-[32px]">
        <CardHeader className="bg-muted/30 border-b border-border py-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Live Registry Lookup</CardTitle>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Secure Link Established</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative bg-muted/5 min-h-[700px]">
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="flex flex-col items-center gap-3 opacity-20">
              <Search className="h-12 w-12 text-muted-foreground animate-bounce" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initializing Terminal...</p>
            </div>
          </div>
          <iframe 
            src="https://resident.fayda.et/status" 
            className="w-full h-[800px] border-none"
            title="Official Fayda Status Check"
            loading="lazy"
            allow="geolocation"
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 p-5 bg-primary/[0.03] border border-primary/10 rounded-2xl">
        <Info className="h-5 w-5 text-primary shrink-0" />
        <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase tracking-widest">
          Disclaimer: This terminal interfaces directly with the official Fayda resident portal. All queries are subject to standard bureau security logging and operational oversight. 
        </p>
      </div>
    </div>
  );
}
