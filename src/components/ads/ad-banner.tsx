
'use client';

import { useContext } from 'react';
import { AdContext } from './ad-provider';
import { Button } from '../ui/button';

export function AdBanner() {
  const { showBanner, setShowBanner } = useContext(AdContext);

  if (!showBanner) {
    return null;
  }
  
  const hideBannerAd = () => {
    if (typeof window !== 'undefined' && window.startapp) {
        window.startapp.hideBannerAd();
    }
    setShowBanner(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-secondary/80 backdrop-blur-sm p-2 text-center border-t md:hidden">
        <div className="relative flex items-center justify-center h-12 bg-muted rounded-md p-2">
            <span className="text-sm text-muted-foreground">إعلان - Start.io (محاكاة)</span>
            <Button
                variant="ghost"
                size="icon"
                onClick={hideBannerAd}
                className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
            >
                ✕
            </Button>
        </div>
    </div>
  );
}
