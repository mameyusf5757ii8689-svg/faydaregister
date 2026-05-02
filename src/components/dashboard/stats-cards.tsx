import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats } from '@/lib/types';
import { 
  CheckCircle2, 
  FileText,
  Users,
  Shield,
  XCircle,
  TrendingUp,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  stats: DashboardStats;
  showOfficerCount?: boolean;
}

export function StatsCards({ stats, showOfficerCount = false }: StatsCardsProps) {
  const allItems = [
    { 
      label: 'Personnel Total', 
      value: stats.totalOfficers, 
      icon: Users, 
      color: 'text-foreground',
      adminOnly: true,
    },
    { 
      label: 'On-Duty Status', 
      value: stats.onDutyOfficers, 
      icon: Shield, 
      color: 'text-emerald-500',
      adminOnly: true,
    },
    { 
      label: 'Intake Total', 
      value: stats.total, 
      icon: TrendingUp, 
      color: 'text-foreground',
      adminOnly: false,
    },
    { 
      label: 'Processed', 
      value: stats.processed, 
      icon: CheckCircle2, 
      color: 'text-emerald-500',
      adminOnly: false,
    },
    { 
      label: 'Processing', 
      value: stats.processing, 
      icon: RefreshCcw, 
      color: 'text-blue-500',
      adminOnly: false,
    },
    { 
      label: 'Failed', 
      value: stats.failed, 
      icon: AlertCircle, 
      color: 'text-slate-500',
      adminOnly: false,
    },
    { 
      label: 'Rejected', 
      value: stats.rejected, 
      icon: XCircle, 
      color: 'text-rose-500',
      adminOnly: false,
    },
  ];

  const filteredItems = allItems.filter(item => {
    if (item.adminOnly && !showOfficerCount) return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {filteredItems.map((item) => (
        <Card key={item.label} className="border border-border bg-card shadow-sm card-hover-effect overflow-hidden rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {item.label}
                </p>
                <div className={cn("text-3xl font-black tracking-tighter text-foreground")}>
                  {item.value.toLocaleString()}
                </div>
              </div>
              <div className={cn("p-2 rounded-lg bg-muted/50 border border-border", item.color)}>
                <item.icon className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
