
'use client';

import { useContext } from 'react';
import { AdContext } from './ad-provider';
import { Button } from '../ui/button';

export function AdBanner() {
  const { showBanner } = useContext(AdContext);

  const hideBannerAd = () => {
    if (typeof window !== 'undefined' && window.startapp) {
        try {
            window.startapp.hideBannerAd();
        } catch (e) {
            console.error("Error hiding banner via SDK", e);
        }
    }
    const bannerElement = document.getElementById('startio-banner-real');
    if (bannerElement) {
        bannerElement.style.display = 'none';
    }
  }

  if (!showBanner) {
    return null;
  }
  
  return (
    <div id="startio-banner-real" style={{position: 'fixed', bottom: '0', left: '0', right: '0', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '12px', textAlign: 'center', zIndex: 1000, borderTop: '2px solid #fff'}}>
        <span style={{color: 'white', fontWeight: 'bold'}}>إعلان - Start.io</span>
        <button onClick={hideBannerAd} style={{position: 'absolute', left: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '15px', cursor: 'pointer', top: '50%', transform: 'translateY(-50%)'}}>✕</button>
    </div>
  );
}
