import { RegistrationStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, RefreshCcw, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: RegistrationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    Processed: {
      label: 'Processed',
      icon: CheckCircle2,
      variant: 'default',
      color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    },
    'Pending Review': {
      label: 'Pending',
      icon: Clock,
      variant: 'secondary',
      color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
    },
    Rejected: {
      label: 'Rejected',
      icon: XCircle,
      variant: 'destructive',
      color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
    },
    Processing: {
      label: 'Processing',
      icon: RefreshCcw,
      variant: 'outline',
      color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
    },
    Failed: {
      label: 'Failed',
      icon: AlertCircle,
      variant: 'outline',
      color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
    },
  }[status];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-0.5 font-medium transition-all shadow-sm rounded-full", 
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
