import { MapPin, Clock } from 'lucide-react';
export function FooterInfoBar() {
  return <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          {/* Location */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Crystal Sports & Leisure Centre</span>
            <span className="sm:hidden">Crystal Sports</span>
          </div>

          {/* Hours */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Thu-Fri: 12-7pm · Sat-Sun: 1-7pm</span>
            <span className="sm:hidden">Thu-Sun Open</span>
          </div>

          {/* Live Status */}
          <div className="flex items-center gap-2">
            <div className="live-dot" />
            <span className="text-success font-semibold tracking-wider text-xs uppercase">
              LIVE NOW
            </span>
          </div>
        </div>
      </div>
    </div>;
}