import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentStatusBadgeProps {
  paymentStatus: string | null;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showAlert?: boolean; // For KDS compact mode
}

export function PaymentStatusBadge({ 
  paymentStatus, 
  onClick, 
  size = 'md',
  showAlert = false 
}: PaymentStatusBadgeProps) {
  // PAID if status is 'paid' OR 'completed'
  const isPaid = paymentStatus === 'paid' || paymentStatus === 'completed';
  const isClickable = !isPaid && onClick;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (showAlert && !isPaid) {
    // Compact alert mode for KDS tickets - amber/yellow for visibility
    return (
      <div 
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 border border-amber-500/50",
          isClickable && "cursor-pointer hover:bg-amber-500/30 transition-colors"
        )}
        onClick={isClickable ? onClick : undefined}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        <AlertTriangle className="w-3 h-3 text-amber-500" />
        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
          PAYMENT PENDING
        </span>
      </div>
    );
  }

  return (
    <Badge
      variant={isPaid ? 'default' : 'destructive'}
      className={cn(
        sizeClasses[size],
        "font-bold uppercase tracking-wide flex items-center gap-1",
        isPaid 
          ? "bg-green-500 hover:bg-green-600 text-white border-green-600" 
          : "bg-amber-500 hover:bg-amber-600 text-black border-amber-600",
        isClickable && "cursor-pointer hover:scale-105 transition-transform"
      )}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <DollarSign className={iconSizes[size]} />
      {isPaid ? 'PAID' : 'PENDING'}
    </Badge>
  );
}
