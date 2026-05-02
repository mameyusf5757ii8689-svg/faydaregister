"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  Phone,
  Smartphone,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths } from 'date-fns';

export default function PreviousPage() {
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 2, 1)); // Default to March 2026

  const currentMonthLabel = format(selectedDate, 'MMMM yyyy');
  const prevMonthDate = subMonths(selectedDate, 1);
  const prevMonthLabel = format(prevMonthDate, 'MMMM yyyy');
  const prevMonthShort = format(prevMonthDate, 'MMMM');

  const handlePrevMonth = () => setSelectedDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedDate(prev => addMonths(prev, 1));

  // Mock data for the historical view
  const stats = {
    current: {
      total: 407,
      ethio: 28,
      safaricom: 378,
      fullMonth: 407
    },
    previous: {
      total: 519,
      ethio: 29,
      safaricom: 490,
      fullMonth: 519
    },
    breakdown: [
      { label: 'Processed', value: 0, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Processing', value: 0, icon: RefreshCcw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Rejected', value: 0, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
      { label: 'Failed', value: 0, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'Pending Review', value: 0, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
    ]
  };

  const calculateChange = (curr: number, prev: number) => {
    const diff = curr - prev;
    const percent = prev !== 0 ? ((diff / prev) * 100).toFixed(1) : "0";
    return { diff, percent, isNegative: diff < 0 };
  };

  const totalChange = calculateChange(stats.current.total, stats.previous.total);
  const ethioChange = calculateChange(stats.current.ethio, stats.previous.ethio);
  const safaricomChange = calculateChange(stats.current.safaricom, stats.previous.safaricom);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <Link href="/registrations" className="flex items-center text-[10px] font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest gap-1.5">
        <ArrowLeft className="h-3 w-3" /> Return to Registry
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground font-headline">Monthly Archive</h1>
          <p className="text-sm text-muted-foreground">Historical throughput metrics for {currentMonthLabel}</p>
        </div>
        
        <div className="flex items-center bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 rounded-none border-r border-border hover:bg-muted"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="px-8 font-black text-[10px] uppercase tracking-widest text-foreground whitespace-nowrap min-w-[180px] text-center">
            {currentMonthLabel}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 rounded-none border-l border-border hover:bg-muted"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Comparative Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ComparisonCard 
            title="Total Intake" 
            month={currentMonthLabel}
            currentValue={stats.current.total} 
            change={totalChange}
            prevMonthLabel={prevMonthLabel}
            prevMonthShort={prevMonthShort}
            prevValue={stats.previous.total}
          />
          <ComparisonCard 
            title="Ethio Line" 
            month={currentMonthLabel}
            currentValue={stats.current.ethio} 
            change={ethioChange}
            prevMonthLabel={prevMonthLabel}
            prevMonthShort={prevMonthShort}
            prevValue={stats.previous.ethio}
          />
          <ComparisonCard 
            title="Safaricom Line" 
            month={currentMonthLabel}
            currentValue={stats.current.safaricom} 
            change={safaricomChange}
            prevMonthLabel={prevMonthLabel}
            prevMonthShort={prevMonthShort}
            prevValue={stats.previous.safaricom}
          />
          <ComparisonCard 
            title="Full Cycle" 
            month={currentMonthLabel}
            currentValue={stats.current.fullMonth} 
            change={totalChange}
            prevMonthLabel={prevMonthLabel}
            prevMonthShort={prevMonthShort}
            prevValue={stats.previous.fullMonth}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Detailed Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SummaryCard title="Aggregate" value={stats.current.total} subtitle={`${currentMonthLabel} Intake`} icon={TrendingUp} iconColor="text-primary" iconBg="bg-primary/10" />
            <SummaryCard title="Ethio" value={stats.current.ethio} subtitle="Direct Intake" icon={Phone} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
            <SummaryCard title="Safaricom" value={stats.current.safaricom} subtitle="Direct Intake" icon={Smartphone} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
            <SummaryCard title="Audit Total" value={stats.current.fullMonth} subtitle="Verified Records" icon={Calendar} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status Breakdown</h2>
          <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardContent className="p-4 space-y-1">
              {stats.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", item.bg)}>
                      <item.icon className={cn("h-4 w-4", item.color)} />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{item.label}</span>
                  </div>
                  <span className="text-lg font-black text-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function ComparisonCard({ title, month, currentValue, change, prevMonthLabel, prevMonthShort, prevValue }: any) {
  return (
    <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-2xl">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
          <p className="text-4xl font-black text-foreground tracking-tighter">{currentValue}</p>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border border-border",
          change.isNegative ? "bg-rose-500/5" : "bg-emerald-500/5"
        )}>
          {change.isNegative ? (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          ) : (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          )}
          <span className={cn(
            "text-[10px] font-black",
            change.isNegative ? "text-rose-600" : "text-emerald-600"
          )}>
            {Math.abs(change.diff)} ({change.percent}%)
          </span>
          <span className="text-[9px] text-muted-foreground font-bold uppercase whitespace-nowrap">vs {prevMonthShort}</span>
        </div>

        <div className="pt-2 border-t border-border border-dashed">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{prevMonthLabel}</p>
          <p className="text-xl font-black text-muted-foreground/40">{prevValue}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon, iconColor, iconBg }: any) {
  return (
    <Card className="border border-border shadow-sm bg-card flex items-center p-6 rounded-2xl">
      <div className="flex-1 space-y-0.5">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-foreground tracking-tighter">{value}</p>
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase">{subtitle}</p>
      </div>
      <div className={cn("p-4 rounded-2xl shadow-inner", iconBg)}>
        <Icon className={cn("h-6 w-6", iconColor)} strokeWidth={2.5} />
      </div>
    </Card>
  );
}
