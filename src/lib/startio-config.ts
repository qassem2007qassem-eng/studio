
export const START_IO_CONFIG = {
  // إعدادات التطبيق
  app: {
    android: {
      appId: '210206864'
    },
    ios: {
      appId: 'YOUR_IOS_APP_ID'
    }
  },

  // إعدادات الإعلانات
  ads: {
    banner: {
      autoShow: true,
      position: 'bottom' as 'top' | 'bottom',
      refreshRate: 30 // ثانية
    },
    interstitial: {
      autoShow: false,
      frequency: 3 // كل 3 مشاهدات (للمحاكاة)
    },
    rewarded: {
      cooldown: 5 // دقائق بين الإعلانات
    }
  },

  // المكافآت
  rewards: {
    pointsPerAd: 50,
    premiumHours: 24,
    adFreeHours: 2,
    features: {
      no_ads: 'إزالة الإعلانات',
      premium_themes: 'ثيمات مميزة',
      advanced_filters: 'فلاتر متقدمة'
    }
  },

  // إعدادات الخصوصية
  privacy: {
    userConsent: true,
    isChildDirected: false,
    gdprCompliant: true
  }
};
