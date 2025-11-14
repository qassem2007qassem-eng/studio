
'use client';

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
import { Logo } from '@/components/logo';
import { useState } from 'react';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';

const ADMIN_EMAIL = 'admin@app.com';
const ADMIN_PASSWORD = 'admin123';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      toast({ title: 'خطأ', description: 'بيانات اعتماد المشرف غير صالحة.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/home/admin');
    } catch (error: any) {
      console.error(error);
      let description = 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
       if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-email'
      ) {
        description = 'فشل التحقق من هوية المشرف مع Firebase.';
      }

      toast({
        title: 'خطأ في تسجيل الدخول',
        description: description,
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
          <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
          <CardTitle className="text-2xl font-headline">تسجيل دخول المشرف</CardTitle>
          <CardDescription>
            هذه الصفحة مخصصة للمشرفين فقط.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">بريد المشرف الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@app.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة مرور المشرف</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'دخول المشرف'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
