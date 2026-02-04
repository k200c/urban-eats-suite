import { useState, useEffect } from 'react';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onNeedRefresh, applyUpdate, APP_VERSION } from '@/lib/pwa';
import { hardResetApp } from '@/lib/resetApp';

export function UpdateToast() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [showEmergencyReset, setShowEmergencyReset] = useState(false);

  useEffect(() => {
    // Subscribe to update notifications
    onNeedRefresh((needRefresh) => {
      setShowUpdate(needRefresh);
    });
  }, []);

  const handleRefresh = () => {
    applyUpdate();
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Show emergency reset option after dismissing
    setShowEmergencyReset(true);
  };

  const handleEmergencyReset = async () => {
    await hardResetApp();
  };

  if (!showUpdate && !showEmergencyReset) {
    return null;
  }

  return (
    <>
      {/* Update Available Toast */}
      {showUpdate && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 md:left-auto md:right-6 md:max-w-sm">
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-4 shadow-lg backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Update Available
              </p>
              <p className="text-xs text-muted-foreground">
                A new version is ready to install
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleRefresh}
                className="shrink-0"
              >
                Refresh
              </Button>
              
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Reset (shown after dismissing update) */}
      {showEmergencyReset && !showUpdate && (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm">
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-card p-3 shadow-lg">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            
            <p className="text-xs text-muted-foreground flex-1">
              Having issues? 
            </p>
            
            <button
              onClick={handleEmergencyReset}
              className="text-xs text-destructive hover:text-destructive/80 underline shrink-0"
            >
              Force Reset
            </button>
            
            <button
              onClick={() => setShowEmergencyReset(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
