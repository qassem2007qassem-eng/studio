
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AdModalProps {
  isOpen: boolean;
  type: 'interstitial' | 'rewarded';
  onClose: (watched: boolean) => void;
}

export function AdModal({ isOpen, type, onClose }: AdModalProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (isOpen) {
      setStatus('loading');
      // Simulate ad loading time
      const timer = setTimeout(() => {
        if (Math.random() > 0.2) { // 80% success rate
          setStatus('ready');
        } else {
          setStatus('error');
          // Auto-close on error
          setTimeout(() => onClose(false), 1500);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const handleClose = (watched: boolean) => {
    onClose(watched);
  };
  
  const title = type === 'rewarded' ? 'إعلان مكافئ' : 'إعلان بيني';

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <DialogDescription>جاري تحميل الإعلان...</DialogDescription>
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </>
        );
      case 'ready':
        return (
          <>
            <DialogDescription>الإعلان جاهز للمشاهدة.</DialogDescription>
            <div className="flex justify-center items-center h-24 bg-secondary rounded-md my-4">
              <p>محتوى الإعلان (محاكاة)</p>
            </div>
          </>
        );
      case 'error':
        return (
            <DialogDescription>لا يوجد إعلانات متاحة حالياً. سيتم إغلاق النافذة.</DialogDescription>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose(false)}>
      <DialogContent showCloseButton={false} className="sm:max-w-[350px] text-center">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        {renderContent()}
        {status === 'ready' && (
             <DialogFooter className="sm:justify-center gap-2">
                <Button variant="secondary" onClick={() => handleClose(false)}>تخطي الإعلان</Button>
                <Button onClick={() => handleClose(true)}>إغلاق الإعلان</Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
