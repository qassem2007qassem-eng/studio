import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import { Cairo } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AdProvider } from '@/components/ads/ad-provider';
import { AdBanner } from '@/components/ads/ad-banner';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Syrian Student Hub',
  description: 'A social and educational platform for Syrian students.',
};

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-cairo',
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
       <head>
        <Script id="startio-sdk-mock" strategy="beforeInteractive">
          {`
            var startapp = startapp || {};
            startapp.initialize = function(appId, callback) {
                console.log('Start.io SDK (Mock) Initialized with:', appId);
                if (callback) callback();
            };
            startapp.showBannerAd = function(success, error) {
                console.log('Start.io SDK (Mock): showBannerAd called');
                if (Math.random() > 0.1) {
                  if (success) success();
                } else {
                  if (error) error('Mock error: No ad available');
                }
            };
            startapp.hideBannerAd = function() {
                console.log('Start.io SDK (Mock): hideBannerAd called');
                const event = new Event('hideStartioBanner');
                window.dispatchEvent(event);
            };
            startapp.showInterstitialAd = function(success, error) {
                console.log('Start.io SDK (Mock): showInterstitialAd called');
                const event = new CustomEvent('showStartioModal', { detail: { type: 'interstitial', success, error } });
                window.dispatchEvent(event);
            };
            startapp.showRewardedVideoAd = function(success, error) {
                console.log('Start.io SDK (Mock): showRewardedVideoAd called');
                const event = new CustomEvent('showStartioModal', { detail: { type: 'rewarded', success, error } });
                window.dispatchEvent(event);
            };
            startapp.isRewardedVideoAvailable = function(success, error) {
                console.log('Start.io SDK (Mock): isRewardedVideoAvailable called');
                if (success) success(true);
            };
          `}
        </Script>
      </head>
      <body className={cn('font-body antialiased', cairo.variable)}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <AdProvider>
              {children}
              <AdBanner />
            </AdProvider>
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
