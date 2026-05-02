
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, RotateCw, Users, TrendingUp, Loader2, Phone, Smartphone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { DailyReport, UserProfile } from '@/lib/types';

export default function LeaderboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [selectedDate, setSelectedDate] = useState('');

  // Handle initialization on client to avoid hydration mismatch
  useEffect(() => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'daily_reports'), limit(1000));
  }, [db, user]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db, user]);

  const { data: reports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

  const leaderboardData = useMemo(() => {
    if (!reports || !allUsers || !selectedDate) return [];

    const dayReports = reports.filter(rep => rep.date === selectedDate);
    const officerStatsMap = new Map<string, { total: number; ethio: number; safaricom: number }>();

    dayReports.forEach(rep => {
      const current = officerStatsMap.get(rep.officerId) || { total: 0, ethio: 0, safaricom: 0 };
      officerStatsMap.set(rep.officerId, {
        total: current.total + (rep.total || 0),
        ethio: current.ethio + (rep.ethioCount || 0),
        safaricom: current.safaricom + (rep.safaricomCount || 0),
      });
    });

    return Array.from(officerStatsMap.entries())
      .map(([officerId, stats]) => {
        const profile = allUsers.find(u => u.id === officerId);
        return {
          officerId,
          name: profile?.fullName || 'Unknown Official',
          cluster: profile?.cluster || 'N/A',
          region: profile?.region || 'N/A',
          registrations: stats.total,
          ethio: stats.ethio,
          safaricom: stats.safaricom,
        };
      })
      .sort((a, b) => b.registrations - a.registrations)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [reports, allUsers, selectedDate]);

  const summary = useMemo(() => {
    const totalRegs = leaderboardData.reduce((acc, curr) => acc + curr.registrations, 0);
    const avg = leaderboardData.length > 0 ? (totalRegs / leaderboardData.length).toFixed(1) : "0";
    return { totalRegs, avg };
  }, [leaderboardData]);

  if (isReportsLoading || isUsersLoading || !selectedDate) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-500" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Official Performance</h1>
          </div>
          <p className="text-sm text-muted-foreground">Ranking by aggregate daily counts for {format(new Date(selectedDate), 'MMMM dd, yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-10 bg-card border-border" />
          <Button variant="outline" className="h-10 border-border" onClick={() => window.location.reload()}><RotateCw className="mr-2 h-4 w-4" /> Sync</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leaderboardData.slice(0, 3).map((perf) => (
          <Card key={perf.officerId} className={cn("border shadow-sm overflow-hidden rounded-xl transition-all hover:shadow-md", perf.rank === 1 ? "bg-amber-50/10 border-amber-200/50" : "bg-card border-border")}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {perf.rank === 1 ? <Trophy className="h-6 w-6 text-amber-500" /> : <Medal className="h-6 w-6 text-muted-foreground" />}
                  <span className="text-2xl font-bold text-foreground">#{perf.rank}</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-foreground">{perf.registrations}</span>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter -mt-1">registrations</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-foreground">{perf.name}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <MapPin className="h-2.5 w-2.5" /> {perf.cluster} • {perf.region}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-muted/30 rounded-lg border border-border shadow-sm">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1"><Phone className="h-2 w-2 text-green-500" /> Ethio</p>
                    <p className="text-lg font-bold text-foreground">{perf.ethio}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border shadow-sm">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1"><Smartphone className="h-2 w-2 text-orange-500" /> Safaricom</p>
                    <p className="text-lg font-bold text-foreground">{perf.safaricom}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard label="Daily Bureau Throughput" value={summary.totalRegs} icon={Users} iconColor="text-blue-500" bgColor="bg-blue-50/10" />
        <SummaryCard label="Avg Efficiency Per Unit" value={summary.avg} icon={TrendingUp} iconColor="text-purple-500" bgColor="bg-purple-50/10" />
      </div>

      <Card className="border border-border bg-card overflow-hidden rounded-xl shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 w-[100px] pl-8">Rank</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12">Official</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12">Cluster</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-center">Ethio</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-center">Safaricom</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-12 text-right pr-8">Daily Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboardData.length > 0 ? leaderboardData.map((perf) => (
              <TableRow key={perf.officerId} className="hover:bg-muted/20 transition-colors border-border h-20">
                <TableCell className="pl-8">
                  <div className="flex items-center gap-3">
                    {perf.rank === 1 ? <Trophy className="h-5 w-5 text-amber-500" /> : <Medal className="h-5 w-5 text-muted-foreground" />}
                    <span className="font-bold text-foreground">#{perf.rank}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-bold text-foreground">{perf.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">{perf.region}</p>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">
                    {perf.cluster}
                  </span>
                </TableCell>
                <TableCell className="text-center font-bold text-green-600">{perf.ethio}</TableCell>
                <TableCell className="text-center font-bold text-orange-600">{perf.safaricom}</TableCell>
                <TableCell className="text-right pr-8"><div className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary/5 text-sm font-black text-primary ring-1 ring-primary/10">{perf.registrations}</div></TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">No field activity reported for this date.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, iconColor, bgColor }: any) {
  return (
    <Card className="border-border shadow-sm bg-card overflow-hidden rounded-xl">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("p-1.5 rounded-lg", bgColor)}><Icon className={cn("h-4 w-4", iconColor)} /></div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
          </div>
          <p className="text-4xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
