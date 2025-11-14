import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import { Cairo } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AdProvider, AdPlaceholders } from '@/components/ads/ad-provider';
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
        <Script src="https://sdk.startapp.com/startapp-sdk.js" strategy="beforeInteractive" />
        <Script id="startio-sdk-mock" strategy="beforeInteractive">
          {`
            var startapp = window.startapp || {};
            // Mock functions if SDK fails to load, to prevent errors.
            if (typeof startapp.initialize !== 'function') {
                startapp.initialize = function(appId, callback) {
                    console.log('Start.io SDK (Mock) Initialized with:', appId);
                    if (callback) callback();
                };
                startapp.showBannerAd = function(success, error) {
                    console.log('Start.io SDK (Mock): showBannerAd called');
                    if (error) error('Mock error: SDK not loaded, using placeholder.');
                };
                startapp.hideBannerAd = function() {
                    console.log('Start.io SDK (Mock): hideBannerAd called');
                };
                startapp.showInterstitialAd = function(success, error) {
                    console.log('Start.io SDK (Mock): showInterstitialAd called');
                    if (error) error('Mock error: SDK not loaded, using placeholder.');
                };
                startapp.showRewardedVideoAd = function(success, error) {
                    console.log('Start.io SDK (Mock): showRewardedVideoAd called');
                     if (error) error('Mock error: SDK not loaded, using placeholder.');
                };
                startapp.isRewardedVideoAvailable = function(success, error) {
                    console.log('Start.io SDK (Mock): isRewardedVideoAvailable called');
                    if (success) success(true); // Assume available for mock
                };
            }
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
              <AdPlaceholders />
            </AdProvider>
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
