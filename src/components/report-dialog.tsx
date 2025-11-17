
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportSubmit: (reason: string) => Promise<void>;
  title: string;
  description: string;
}

export function ReportDialog({
  open,
  onOpenChange,
  onReportSubmit,
  title,
  description,
}: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onReportSubmit(reason);
    setIsSubmitting(false);
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">السبب (مطلوب)</Label>
            <Textarea
              id="reason"
              placeholder="يرجى تقديم تفاصيل إضافية..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={!reason.trim() || isSubmitting}>
            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'إرسال الإبلاغ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
