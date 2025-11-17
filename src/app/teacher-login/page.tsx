
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
import { GraduationCap } from 'lucide-react';
import { CatLoader } from '@/components/cat-loader';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const TEACHER_EMAIL_SUFFIX = '@teacher.app.com';

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const { firestore } = initializeFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let teacherEmail = email.trim();
    if (!teacherEmail.includes('@')) {
        teacherEmail = `${teacherEmail}${TEACHER_EMAIL_SUFFIX}`;
    }
    
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, teacherEmail, password);
      router.push('/home/teacher');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // For simplicity in this example, we'll auto-create a teacher account on first login attempt.
        // In a real app, you'd have a separate registration or admin approval flow.
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, teacherEmail, password);
            const user = userCredential.user;

            const teacherDocRef = doc(firestore, 'teachers', user.uid);
            await setDoc(teacherDocRef, {
                id: user.uid,
                name: email.split('@')[0], // Simple name generation
                email: teacherEmail,
                bio: 'مدرس متخصص في...',
                profilePictureUrl: '',
                courseIds: [],
                createdAt: serverTimestamp(),
            });
            
            router.push('/home/teacher');
        } catch (creationError: any) {
             console.error("Teacher account creation failed:", creationError);
             toast({
                title: 'خطأ في إنشاء حساب المعلم',
                description: creationError.message || 'فشل إنشاء حساب المعلم.',
                variant: 'destructive',
             });
        }
      } else {
         console.error(error);
         toast({
            title: 'خطأ في تسجيل الدخول',
            description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
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
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-primary" />
          <CardTitle className="text-2xl font-headline">منصة المعلمين</CardTitle>
          <CardDescription>
            قم بتسجيل الدخول لإدارة المحتوى التعليمي الخاص بك.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">بريد المعلم الإلكتروني</Label>
              <Input
                id="email"
                type="text"
                placeholder="example أو example@teacher.app.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <CatLoader className="mx-auto" /> : 'تسجيل الدخول'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    