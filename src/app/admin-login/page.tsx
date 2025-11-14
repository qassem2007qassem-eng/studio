
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
import { useState } from 'react';
import { useAuth, initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';


const ADMIN_EMAIL = 'admin@app.com';
const ADMIN_PASSWORD = 'admin123';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const { firestore } = initializeFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      toast({ title: 'خطأ', description: 'بيانات اعتماد المشرف غير صالحة.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/home/admin');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // If admin user does not exist, create it
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create a user profile document for the admin
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                id: user.uid,
                username: 'admin',
                email: email,
                name: 'Admin',
                createdAt: serverTimestamp(),
                bio: 'The administrator account.',
                avatarUrl: '',
                coverUrl: '',
                followers: [],
                following: [],
                isPrivate: true,
            });
            
            router.push('/home/admin');
        } catch (creationError: any) {
             console.error("Admin creation failed:", creationError);
             toast({
                title: 'خطأ في إنشاء حساب المشرف',
                description: creationError.message || 'فشل إنشاء حساب المشرف.',
                variant: 'destructive',
             });
        }
      } else {
         console.error(error);
         let description = 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
         toast({
            title: 'خطأ في تسجيل الدخول',
            description: description,
            variant: 'destructive',
         });
      }
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
                placeholder="admin123"
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
