
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MailCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { markEmailAsVerified } from '@/services/user-service';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast({
        title: 'خطأ',
        description: 'الرجاء إدخال رمز صحيح مكون من 6 أرقام.',
        variant: 'destructive',
      });
      return;
    }
    if (!email) {
       toast({
        title: 'خطأ',
        description: 'البريد الإلكتروني غير موجود. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // In a real app, you would send the code to your backend to verify it.
      // For now, we'll just simulate a successful verification.
      // The `markEmailAsVerified` function will find the user by email and update their status.
      const isVerified = await markEmailAsVerified(email);

      if (isVerified) {
        toast({
          title: 'نجاح',
          description: 'تم التحقق من بريدك الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول.',
        });
        router.push('/login');
      } else {
         throw new Error("Verification failed.");
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'خطأ في التحقق',
        description: error.message || 'الرمز الذي أدخلته غير صحيح أو انتهت صلاحيته. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <MailCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <CardTitle className="text-2xl font-headline">التحقق من البريد الإلكتروني</CardTitle>
          <CardDescription>
            لقد أرسلنا رمزًا مكونًا من 6 أرقام إلى <span className="font-semibold">{email}</span>. الرجاء إدخاله أدناه.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="verification-code">رمز التحقق</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="123456"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isLoading}
                maxLength={6}
                dir="ltr"
                className="text-center tracking-[1em]"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'تحقق'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <VerifyEmailForm />
        </Suspense>
    )
}

    