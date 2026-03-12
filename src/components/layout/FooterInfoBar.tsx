import { useState, useCallback } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { cn } from '@/lib/utils';
import { hardResetApp } from '@/lib/resetApp';

export function FooterInfoBar() {
  const { isStoreOpen, devModeEnabled } = useStoreStatus();
  const [tapCount, setTapCount] = useState(0);

  // Hidden dev feature: triple-tap status dot to perform hard reset
  const handleStatusTap = useCallback(async () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    // Reset tap count after 2 seconds of inactivity
    setTimeout(() => setTapCount(0), 2000);
    
    // Triple tap triggers hard reset
    if (newCount >= 3) {
      console.log('Triple tap detected - performing hard reset...');
      await hardResetApp();
    }
  }, [tapCount]);

  return (
    <div className="w-full bg-black/95 backdrop-blur-sm border-t border-white/10" style={{ minHeight: 'var(--bottom-bar-height)' }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1 sm:py-2">
        <div className="flex items-center justify-between text-[10px] sm:text-xs">
          {/* Location */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="hidden sm:inline truncate">Crystal Sports & Leisure Centre</span>
            <span className="sm:hidden truncate">Crystal Sports</span>
          </div>

          {/* Hours */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="hidden sm:inline">Thu-Fri: 12-7pm · Sat-Sun: 1-7pm</span>
            <span className="sm:hidden">Thu-Sun Open</span>
          </div>

          {/* Live Status - Dynamic based on store open/closed */}
          <div 
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={handleStatusTap}
          >
            <div 
              className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isStoreOpen ? "bg-success shadow-[0_0_8px_hsl(var(--success))]" : "bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]"
              )} 
            />
            <span 
              className={cn(
                "font-semibold tracking-wider text-xs uppercase",
                isStoreOpen ? "text-success" : "text-destructive"
              )}
            >
              {devModeEnabled ? "DEV MODE" : (isStoreOpen ? "LIVE NOW" : "CLOSED")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}