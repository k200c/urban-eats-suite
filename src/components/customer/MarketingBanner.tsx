import { X } from 'lucide-react';
import { useState } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

export function MarketingBanner() {
  const { data: settings } = useAppSettings();
  const [dismissed, setDismissed] = useState(false);

  if (!settings?.marketing_banner_enabled || !settings?.marketing_banner_text || dismissed) {
    return null;
  }

  return (
    <div className="bg-primary text-primary-foreground py-2 px-4 flex items-center justify-center gap-2 relative">
      <span className="text-sm font-medium text-center">
        {settings.marketing_banner_text}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 p-1 hover:bg-primary-foreground/10 rounded"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
