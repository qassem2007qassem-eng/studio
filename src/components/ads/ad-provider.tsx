
'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AdModal } from './ad-modal';
import { START_IO_CONFIG } from '@/lib/startio-config';
import { usePathname } from 'next/navigation';

interface AdContextType {
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
  showInterstitialAd: () => Promise<{ success: boolean; message: string }>;
  showRewardedAd: (rewardType: string) => Promise<{ success: boolean; message: string }>;
  isAdFree: () => boolean;
}

export const AdContext = createContext<AdContextType>(null!);

declare global {
  interface Window {
    startapp: any;
  }
}

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'interstitial' | 'rewarded';
    onClose: (watched: boolean) => void;
  }>({ isOpen: false, type: 'interstitial', onClose: () => {} });

  const pathname = usePathname();
  const [postViewCount, setPostViewCount] = useState(0);
  const [lastRewardedAdTime, setLastRewardedAdTime] = useState(0);

  // Initialize the mock SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && window.startapp && !isInitialized) {
      const appId = START_IO_CONFIG.app.android.appId; // Use a placeholder
      window.startapp.initialize(appId, () => {
        setIsInitialized(true);
        if (START_IO_CONFIG.ads.banner.autoShow) {
          window.startapp.showBannerAd(
            () => setShowBanner(true),
            (error: any) => console.error("Mock Banner Ad Error:", error)
          );
        }
      });
    }

    const handleHideBanner = () => setShowBanner(false);
    const handleShowModal = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { type, success, error } = customEvent.detail;

        setModalState({
            isOpen: true,
            type: type,
            onClose: (watched) => {
                setModalState({ isOpen: false, type, onClose: () => {} });
                if (watched && success) success();
                else if (!watched && error) error('Ad skipped by user.');
            }
        });
    };


    window.addEventListener('hideStartioBanner', handleHideBanner);
    window.addEventListener('showStartioModal', handleShowModal);

    return () => {
        window.removeEventListener('hideStartioBanner', handleHideBanner);
        window.removeEventListener('showStartioModal', handleShowModal);
    }

  }, [isInitialized]);

  // Track post views for interstitial ads
  useEffect(() => {
    // This is a simple way to track navigation to post-like pages.
    // A more robust solution might use a global state or context.
    if (pathname.includes('/home/profile/') || pathname === '/home') {
        setPostViewCount(prev => prev + 1);
    }
  }, [pathname]);

  const showInterstitialAd = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (isAdFree()) return { success: false, message: "Ad-free period is active." };
    
    if (postViewCount < START_IO_CONFIG.ads.interstitial.frequency) {
        return { success: false, message: "Not enough post views." };
    }

    return new Promise((resolve) => {
        if (!isInitialized) {
            resolve({ success: false, message: "Ads not initialized."});
            return;
        }
        window.startapp.showInterstitialAd(
            () => { 
                setPostViewCount(0); // Reset counter
                resolve({ success: true, message: "Interstitial ad shown."});
            },
            (error: any) => {
                console.error("Interstitial failed:", error);
                resolve({ success: false, message: "Failed to show interstitial ad."});
            }
        );
    });
  }, [isInitialized, postViewCount]);

  const canShowRewardedAd = useCallback((): boolean => {
    const now = Date.now();
    const cooldownMs = START_IO_CONFIG.ads.rewarded.cooldown * 60 * 1000;
    return (now - lastRewardedAdTime) >= cooldownMs;
  }, [lastRewardedAdTime]);

  const showRewardedAd = useCallback(async (rewardType: string): Promise<{ success: boolean; message: string }> => {
    if (!canShowRewardedAd()) {
        return { success: false, message: "يجب الانتظار قبل مشاهدة إعلان آخر" };
    }

    const isAvailable = await new Promise<boolean>((resolve) => {
        window.startapp.isRewardedVideoAvailable(
            (available: boolean) => resolve(available),
            () => resolve(false)
        );
    });

    if (!isAvailable) {
        return { success: false, message: "لا يوجد إعلانات متاحة حالياً" };
    }

    return new Promise((resolve) => {
         if (!isInitialized) {
            resolve({ success: false, message: "Ads not initialized."});
            return;
        }
        window.startapp.showRewardedVideoAd(
            () => {
                setLastRewardedAdTime(Date.now());
                const message = getRewardMessage(rewardType);
                // Here you would grant the actual reward (e.g., update user profile in Firestore)
                console.log(`Granting reward: ${rewardType}`);
                resolve({ success: true, message });
            },
            (error: any) => {
                console.error("Rewarded ad failed:", error);
                resolve({ success: false, message: "فشل في عرض الإعلان" });
            }
        );
    });
  }, [isInitialized, canShowRewardedAd]);

  const getRewardMessage = (rewardType: string): string => {
    const messages: { [key: string]: string } = {
      'premium_features': `تم منحك ميزات مميزة لمدة ${START_IO_CONFIG.rewards.premiumHours} ساعة`,
      'extra_points': `تم إضافة ${START_IO_CONFIG.rewards.pointsPerAd} نقطة إلى رصيدك`,
      'remove_ads': `تم إزالة الإعلانات لمدة ${START_IO_CONFIG.rewards.adFreeHours} ساعات`
    };
    return messages[rewardType] || 'تم منحك المكافأة';
  };

  const isAdFree = (): boolean => {
    // Implement logic to check if user has a temporary ad-free status
    return false; 
  };


  return (
    <AdContext.Provider value={{ showBanner, setShowBanner, showInterstitialAd, showRewardedAd, isAdFree }}>
      {children}
      <AdModal 
        isOpen={modalState.isOpen}
        type={modalState.type}
        onClose={modalState.onClose}
      />
    </AdContext.Provider>
  );
}
