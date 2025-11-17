

'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, GraduationCap, User } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createUserProfile } from '@/services/user-service';
import { Skeleton } from '@/components/ui/skeleton';

const TEACHER_EMAIL_SUFFIX = '@teacher.app.com';


function RegisterForm() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    accountType: 'student' as 'student' | 'teacher',
    email: '',
    fullName: '',
    dob: undefined as Date | undefined,
    gender: '',
    username: '',
    password: '',
  });
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  const { auth, firestore } = initializeFirebase();
  const { toast } = useToast();

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'username') {
      const lowerCaseValue = value.toLowerCase();
      if (/[^a-z0-9._]/.test(lowerCaseValue)) {
        setUsernameError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية صغيرة، أرقام، نقاط، أو شرطات سفلية فقط.');
      } else {
        setUsernameError(null);
      }
      setFormData((prev) => ({ ...prev, [name]: lowerCaseValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateAccount = async () => {
    if (usernameError) {
       toast({
          title: "خطأ في اسم المستخدم",
          description: usernameError,
          variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    const usernameLower = formData.username.toLowerCase();
    
    let finalEmail = formData.email;
    if (formData.accountType === 'teacher' && !finalEmail.includes('@')) {
        finalEmail = `${finalEmail}${TEACHER_EMAIL_SUFFIX}`;
    }

    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('username', '==', usernameLower));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          title: 'خطأ في إنشاء الحساب',
          description: 'اسم المستخدم هذا مستخدم بالفعل. الرجاء اختيار اسم آخر.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        finalEmail,
        formData.password
      );
      const user = userCredential.user;

      await createUserProfile(user, {
          username: usernameLower,
          name: formData.fullName,
          email: finalEmail,
          emailVerified: user.emailVerified,
          accountType: formData.accountType,
      });

      if (formData.accountType === 'teacher') {
          const teacherDocRef = doc(firestore, 'teachers', user.uid);
            await setDoc(teacherDocRef, {
                id: user.uid,
                name: formData.fullName,
                email: finalEmail,
                bio: 'مدرس متخصص في...',
                profilePictureUrl: '',
                courseIds: [],
                createdAt: serverTimestamp(),
            });
      }
      
      await updateProfile(user, {
        displayName: formData.fullName,
      });

      // Sign in the user automatically after registration
      await signInWithEmailAndPassword(auth, finalEmail, formData.password);
      router.push('/home');


    } catch (error: any) {
      setIsLoading(false);
      let description = 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
      if (error.code === 'auth/weak-password') {
        description = 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
      } else if (error.code === 'auth/email-already-in-use') {
        description = 'هذا البريد الإلكتروني مستخدم بالفعل.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'البريد الإلكتروني الذي أدخلته غير صالح.';
      }
      toast({
        title: 'خطأ في إنشاء الحساب',
        description: error.message || description,
        variant: 'destructive',
      });
    }
  };

  const stepsContent = [
    {
      title: 'اختر نوع حسابك',
      field: 'accountType',
      validation: () => !!formData.accountType,
      content: (
        <div className="grid gap-4">
          <Label>نوع الحساب</Label>
          <RadioGroup
            value={formData.accountType}
            onValueChange={(value: 'student' | 'teacher') => setFormData((p) => ({ ...p, accountType: value }))}
            className="grid grid-cols-2 gap-2"
          >
            <Label
              htmlFor="student"
              className="flex flex-col items-center justify-center gap-2 border rounded-md p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/10"
            >
              <User className="h-8 w-8"/>
              طالب
              <RadioGroupItem value="student" id="student" className="sr-only" />
            </Label>
            <Label
              htmlFor="teacher"
              className="flex flex-col items-center justify-center gap-2 border rounded-md p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:bg-primary/10"
            >
              <GraduationCap className="h-8 w-8" />
              معلم
              <RadioGroupItem value="teacher" id="teacher" className="sr-only"/>
            </Label>
          </RadioGroup>
        </div>
      ),
    },
    {
      title: 'ما هو بريدك الإلكتروني؟',
      field: 'email',
      validation: () => formData.email && (formData.accountType === 'teacher' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)),
      content: (
        <div className="grid gap-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            name="email"
            type={formData.accountType === 'teacher' ? 'text' : 'email'}
            placeholder={formData.accountType === 'teacher' ? 'ahmad (سيضاف @teacher.app.com)' : 'ahmad@example.com'}
            required
            value={formData.email}
            onChange={handleChange}
          />
        </div>
      ),
    },
    {
      title: 'ما هو اسمك الكامل؟',
      field: 'fullName',
      validation: () => !!formData.fullName,
      content: (
        <div className="grid gap-2">
          <Label htmlFor="fullName">الاسم الكامل</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="مثال: أحمد الصالح"
            required
            value={formData.fullName}
            onChange={handleChange}
          />
        </div>
      ),
    },
    {
      title: 'اختر اسم مستخدم',
      field: 'username',
      validation: () => !!formData.username && !usernameError,
      content: (
        <div className="grid gap-2">
          <Label htmlFor="username">اسم المستخدم</Label>
          <Input
            id="username"
            name="username"
            placeholder="مثال: ahmad.k (أحرف صغيرة فقط)"
            required
            value={formData.username}
            onChange={handleChange}
            className={cn(usernameError && "border-destructive")}
          />
          {usernameError && <p className="text-sm text-destructive">{usernameError}</p>}
        </div>
      ),
    },
    {
      title: 'اختر كلمة مرور قوية',
      field: 'password',
      validation: () => !!formData.password && formData.password.length >= 6,
      content: (
        <div className="grid gap-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
          />
           {formData.password && formData.password.length < 6 && <p className="text-sm text-destructive">يجب أن تكون كلمة المرور 6 أحرف على الأقل.</p>}
        </div>
      ),
    },
  ];

  const currentStepData = stepsContent[step - 1];
  const isFinalStep = step === stepsContent.length;
  
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mx-auto mb-4" />
        <CardTitle className="text-2xl font-headline">{currentStepData.title}</CardTitle>
        <CardDescription>
          {`إنشاء حساب - الخطوة ${step} من ${stepsContent.length}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {currentStepData.content}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {step > 1 && (
              <Button variant="outline" onClick={handlePrev} disabled={isLoading}>
                السابق
              </Button>
            )}

            {!isFinalStep && (
              <Button
                onClick={handleNext}
                disabled={!currentStepData.validation() || isLoading}
                className={cn(step === 1 ? 'col-span-2' : '', 'col-span-1')}
              >
                {'التالي'}
              </Button>
            )}

            {isFinalStep && (
              <Button
                onClick={handleCreateAccount}
                disabled={isLoading || !currentStepData.validation()}
                className={cn(step > 1 ? 'col-span-1' : 'col-span-2')}
              >
                {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'إنشاء حساب'}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 text-center text-sm">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="underline">
            تسجيل الدخول
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}


export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-secondary"><Skeleton className="h-[550px] w-full max-w-sm" /></div>}>
            <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
                <RegisterForm />
            </div>
        </Suspense>
    );
}
