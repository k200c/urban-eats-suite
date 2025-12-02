import { Stamp, Gift } from 'lucide-react';

interface LoyaltyCardProps {
  points: number;
  maxPoints?: number;
}

export function LoyaltyCard({ points, maxPoints = 10 }: LoyaltyCardProps) {
  const stamps = Array.from({ length: maxPoints }, (_, i) => i < points);
  const isComplete = points >= maxPoints;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg text-foreground">Loyalty Card</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {points}/{maxPoints}
        </span>
      </div>
      
      <div className="grid grid-cols-5 gap-2 mb-3">
        {stamps.map((filled, index) => (
          <div
            key={index}
            className={`loyalty-stamp ${filled ? 'filled' : 'empty'}`}
          >
            <Stamp className="w-5 h-5" />
          </div>
        ))}
      </div>

      {isComplete ? (
        <p className="text-center text-primary font-semibold text-sm">
          🎉 Claim your FREE burger!
        </p>
      ) : (
        <p className="text-center text-muted-foreground text-xs">
          {maxPoints - points} more orders for a FREE burger
        </p>
      )}
    </div>
  );
}
