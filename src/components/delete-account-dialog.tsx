
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { deleteCurrentUserAccount } from '@/services/user-service';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountDeleted: () => void;
}

export function DeleteAccountDialog({
  isOpen,
  onOpenChange,
  onAccountDeleted,
}: DeleteAccountDialogProps) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordSubmit = async () => {
    if (!password) {
      toast({
        title: 'كلمة المرور مطلوبة',
        description: 'الرجاء إدخال كلمة المرور للمتابعة.',
        variant: 'destructive',
      });
      return;
    }
    // This is a simple check. The real verification happens in the backend function.
    // We move to the next step optimistically, and the backend will throw an error if the password is wrong.
    setStep(2);
  };
  
  const handleFinalDelete = async () => {
    setIsLoading(true);
    try {
        await deleteCurrentUserAccount(password);
        toast({
            title: 'تم حذف الحساب',
            description: 'تم حذف حسابك بنجاح.',
        });
        onAccountDeleted();
    } catch (error: any) {
        console.error("Account deletion error:", error);
        let description = 'فشل حذف الحساب. الرجاء المحاولة مرة أخرى.';
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            description = 'كلمة المرور غير صحيحة. الرجاء إغلاق النافذة والمحاولة مرة أخرى.';
        }
        toast({
            title: 'خطأ في حذف الحساب',
            description: description,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
        setStep(1); // Reset to first step
        setPassword('');
        onOpenChange(false);
    }
  }
  
  const handleClose = () => {
    if (isLoading) return;
    setStep(1);
    setPassword('');
    onOpenChange(false);
  }

  if (step === 2) {
    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                    <AlertDialogDescription>
                        هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف حسابك وجميع بياناتك، بما في ذلك المنشورات والتعليقات والمتابعين، بشكل دائم.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setStep(1)} disabled={isLoading}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFinalDelete} className="bg-destructive hover:bg-destructive/90" disabled={isLoading}>
                         {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'نعم، قم بالحذف'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تأكيد حذف الحساب</DialogTitle>
          <DialogDescription>
            لأسباب أمنية، يرجى إدخال كلمة المرور الخاصة بك لتأكيد رغبتك في حذف حسابك نهائيًا.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            إلغاء
          </Button>
          <Button variant="destructive" onClick={handlePasswordSubmit}>
            متابعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
