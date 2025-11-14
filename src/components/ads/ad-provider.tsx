
'use client';

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { AdModal } from './ad-modal';
import { START_IO_CONFIG } from '@/lib/startio-config';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';

interface AdContextType {
  showBanner: boolean;
  showRewardedAd: (rewardType: string) => Promise<{ success: boolean; message: string }>;
  isAdFree: () => boolean;
}

export const AdContext = createContext<AdContextType>(null!);

declare global {
  interface Window {
    startapp: any;
    rewardedCallback?: (success: boolean) => void;
    interstitialCallback?: (success: boolean) => void;
  }
}

// This component will render the HTML placeholders for the ads.
export function AdPlaceholders() {
    return (
        <>
            <div id="interstitial-placeholder" style={{display: 'none'}}>
                 <div style={{position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <div style={{background: 'white', padding: '30px', borderRadius: '15px', textAlign: 'center', maxWidth: '400px', width: '90%'}}>
                        <h3 style={{color: '#333', marginBottom: '15px'}}>إعلان تجريبي</h3>
                        <p style={{color: '#666', marginBottom: '20px'}}>هذا إعلان تجريبي من Start.io</p>
                        <div style={{background: '#f0f0f0', padding: '20px', borderRadius: '10px', margin: '15px 0'}}>
                            <p style={{color: '#888', fontStyle: 'italic'}}>مساحة الإعلان الحقيقي</p>
                        </div>
                        <Button onClick={() => window.interstitialCallback?.(true)} style={{padding: '12px 30px', borderRadius: '25px', fontSize: '16px', margin: '10px'}}>
                            ✓ متابعة
                        </Button>
                        <br/>
                         <Button variant="secondary" onClick={() => window.interstitialCallback?.(false)} style={{padding: '8px 20px', borderRadius: '20px', margin: '5px'}}>
                            تخطي الإعلان
                        </Button>
                    </div>
                </div>
            </div>
             <div id="rewarded-placeholder" style={{display: 'none'}}>
                <div style={{position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <div style={{background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '30px', borderRadius: '20px', textAlign: 'center', maxWidth: '400px', width: '90%', color: 'white'}}>
                        <h3 style={{marginBottom: '15px'}}>🎁 إعلان مكافئ</h3>
                        <p style={{marginBottom: '20px', opacity: 0.9}}>شاهد هذا الإعلان للحصول على مكافأة!</p>
                        <div style={{background: 'rgba(255,255,255,0.2)', padding: '25px', borderRadius: '15px', margin: '20px 0'}}>
                            <p style={{fontSize: '14px', opacity: 0.8}}>مساحة إعلان Start.io المكافئ</p>
                        </div>
                        <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                             <Button onClick={() => window.rewardedCallback?.(true)} style={{background: '#28a745', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold'}}>
                                👑 احصل على المكافأة
                            </Button>
                             <Button onClick={() => window.rewardedCallback?.(false)} style={{background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,0.5)', padding: '12px 20px', borderRadius: '25px', cursor: 'pointer'}}>
                                تخطي
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const pathname = usePathname();
  const [postViewCount, setPostViewCount] = useState(0);
  const [lastRewardedAdTime, setLastRewardedAdTime] = useState(0);

  // Initialize the Ads (Placeholder logic)
  useEffect(() => {
    // In a real scenario, this would initialize the Start.io SDK.
    // Since it fails in this environment, we'll just simulate initialization.
    const timer = setTimeout(() => {
      console.log('Ad provider initialized (using placeholders).');
      setIsInitialized(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Show banner ad once initialized
  useEffect(() => {
    if(isInitialized && START_IO_CONFIG.ads.banner.autoShow) {
      console.log('Showing banner placeholder.');
      setShowBanner(true);
    }
  }, [isInitialized]);


  // Track post views for interstitial ads
  useEffect(() => {
    const showInterstitialIfNeeded = async () => {
        if (isInitialized && !isAdFree() && postViewCount >= START_IO_CONFIG.ads.interstitial.frequency) {
            console.log('Interstitial trigger count reached. Showing placeholder.');
            showPlaceholder('interstitial');
            setPostViewCount(0); // Reset counter
        }
    };
    showInterstitialIfNeeded();
  }, [postViewCount, isInitialized]);
  
  useEffect(() => {
      // A simple way to detect a "post view". This should be more specific in a real app.
      if (pathname.includes('/home/profile/') || pathname === '/home') {
        setPostViewCount(prev => prev + 1);
      }
  }, [pathname])


  const showPlaceholder = (type: 'interstitial' | 'rewarded'): Promise<boolean> => {
        return new Promise((resolve) => {
            const placeholder = document.getElementById(`${type}-placeholder`);
            if (!placeholder) {
                console.error(`Placeholder element for ${type} not found!`);
                resolve(false);
                return;
            }

            const callback = (success: boolean) => {
                placeholder.style.display = 'none';
                if (type === 'rewarded') window.rewardedCallback = undefined;
                if (type === 'interstitial') window.interstitialCallback = undefined;
                resolve(success);
            };

            if (type === 'rewarded') window.rewardedCallback = callback;
            if (type === 'interstitial') window.interstitialCallback = callback;

            placeholder.style.display = 'flex';
        });
    };

  const showRewardedAd = useCallback(async (rewardType: string): Promise<{ success: boolean; message: string }> => {
    const now = Date.now();
    const cooldownMs = START_IO_CONFIG.ads.rewarded.cooldown * 60 * 1000;
    if ((now - lastRewardedAdTime) < cooldownMs) {
      return { success: false, message: "يجب الانتظار قبل مشاهدة إعلان آخر" };
    }

    if (!isInitialized) {
        return { success: false, message: 'خدمة الإعلانات لم تهيأ بعد.' };
    }

    return new Promise((resolve) => {
        const adCallback = (watched: boolean) => {
            if (watched) {
                setLastRewardedAdTime(Date.now());
                resolve({ success: true, message: getRewardMessage(rewardType) });
            } else {
                resolve({ success: false, message: 'تم تخطي الإعلان.' });
            }
        };
        
        console.log('Showing rewarded placeholder.');
        showPlaceholder('rewarded').then(adCallback);
    });

  }, [isInitialized, lastRewardedAdTime]);

  const getRewardMessage = (rewardType: string): string => {
    // Grant reward logic can be placed here, e.g. using localStorage
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
    <AdContext.Provider value={{ showBanner, showRewardedAd, isAdFree }}>
      {children}
    </AdContext.Provider>
  );
}
