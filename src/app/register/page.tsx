
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
import { CalendarIcon, CheckCircle, GraduationCap, User } from 'lucide-react';
import { CatLoader } from '@/components/cat-loader';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, type User as AuthUser } from 'firebase/auth';
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

function StudentRegisterForm() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
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
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      await createUserProfile(user, {
        username: usernameLower,
        name: formData.fullName,
        email: user.email!,
        emailVerified: user.emailVerified,
      });
      
      await updateProfile(user, {
        displayName: formData.fullName,
      });

      await sendEmailVerification(user);
      
      toast({
        title: "الرجاء التحقق من بريدك الإلكتروني",
        description: "مرحبا بك عزيزي المستخدم لاتفصلك سوا فاصلة عن اكتشاف عالمنا تحقق من بريدك الاكتروني فريق مجمع الطلاب السوري",
      });
      router.push('/login');

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
        description: error.message || description, // Show specific error from services if available
        variant: 'destructive',
      });
    }
  };

  const stepsContent = [
    {
      title: 'ما هو بريدك الإلكتروني؟',
      field: 'email',
      validation: () => formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      content: (
        <div className="grid gap-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="ahmad@example.com"
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
      title: 'متى تاريخ ميلادك؟',
      field: 'dob',
      validation: () => !!formData.dob,
      content: (
        <div className="grid gap-2">
          <Label>تاريخ الميلاد</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.dob && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.dob ? format(formData.dob, 'PPP') : <span>اختر تاريخاً</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.dob}
                onSelect={(date) => setFormData((p) => ({ ...p, dob: date }))}
                initialFocus
                captionLayout="dropdown-buttons"
                fromYear={1950}
                toYear={new Date().getFullYear() - 10}
              />
            </PopoverContent>
          </Popover>
        </div>
      ),
    },
    {
      title: 'ما هو جنسك؟',
      field: 'gender',
      validation: () => !!formData.gender,
      content: (
        <div className="grid gap-4">
          <Label>الجنس</Label>
          <RadioGroup
            defaultValue={formData.gender}
            onValueChange={(value) => setFormData((p) => ({ ...p, gender: value }))}
            className="flex gap-4"
          >
            <Label
              htmlFor="male"
              className="flex items-center gap-2 border rounded-md p-4 flex-1 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground"
            >
              <RadioGroupItem value="male" id="male" />
              ذكر
            </Label>
            <Label
              htmlFor="female"
              className="flex items-center gap-2 border rounded-md p-4 flex-1 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground"
            >
              <RadioGroupItem value="female" id="female" />
              أنثى
            </Label>
          </RadioGroup>
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
          {`حساب طالب - الخطوة ${step} من ${stepsContent.length}`}
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
                className="col-span-2"
              >
                {isLoading ? <CatLoader className="mx-auto" /> : 'إنشاء حساب'}
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

function TeacherRegisterForm({ onBack }: { onBack: () => void }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { auth, firestore } = initializeFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const TEACHER_EMAIL_SUFFIX = '@teacher.app.com';

    const handleTeacherRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !fullName) {
            toast({ title: 'خطأ', description: 'الرجاء ملء جميع الحقول.', variant: 'destructive' });
            return;
        }
        
        const teacherEmail = email.endsWith(TEACHER_EMAIL_SUFFIX) ? email : `${email}${TEACHER_EMAIL_SUFFIX}`;
        
        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, teacherEmail, password);
            const user = userCredential.user;

            const teacherDocRef = doc(firestore, 'teachers', user.uid);
            await setDoc(teacherDocRef, {
                id: user.uid,
                name: fullName,
                email: teacherEmail,
                bio: 'مدرس متخصص في...',
                profilePictureUrl: '',
                courseIds: [],
                createdAt: serverTimestamp(),
            });
            
            toast({ title: 'نجاح!', description: 'تم إنشاء حساب المعلم الخاص بك. يمكنك الآن تسجيل الدخول.' });
            router.push('/teacher-login');

        } catch (error: any) {
            console.error("Teacher account creation failed:", error);
            let description = 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
            if (error.code === 'auth/weak-password') {
                description = 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
            } else if (error.code === 'auth/email-already-in-use') {
                description = 'هذا البريد الإلكتروني مستخدم بالفعل.';
            } else if (error.code === 'auth/invalid-email') {
                description = 'البريد الإلكتروني الذي أدخلته غير صالح.';
            }
             toast({
                title: 'خطأ في إنشاء حساب المعلم',
                description: description,
                variant: 'destructive',
             });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="mx-auto w-full max-w-sm">
            <CardHeader className="text-center">
                 <Logo className="mx-auto mb-4" />
                <CardTitle className="text-2xl font-headline">إنشاء حساب معلم</CardTitle>
                <CardDescription>
                    انضم إلى منصتنا كمعلم وشارك معرفتك.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleTeacherRegister} className="grid gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="teacher-fullname">الاسم الكامل</Label>
                        <Input
                            id="teacher-fullname"
                            type="text"
                            placeholder="أحمد الصالح"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="teacher-email">البريد الإلكتروني</Label>
                        <Input
                            id="teacher-email"
                            type="email"
                            placeholder="ahmad"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">سيتم إضافة @teacher.app.com تلقائياً.</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="teacher-password">كلمة المرور</Label>
                        <Input
                            id="teacher-password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <CatLoader className="mx-auto" /> : 'إنشاء حساب معلم'}
                    </Button>
                </form>
                <Button variant="link" className="w-full mt-2" onClick={onBack}>العودة</Button>
            </CardContent>
        </Card>
    );
}


function RegisterTypeSelection({ onSelect }: { onSelect: (type: 'student' | 'teacher') => void }) {
    return (
        <Card className="mx-auto w-full max-w-sm">
            <CardHeader className="text-center">
                <Logo className="mx-auto mb-4" />
                <CardTitle className="text-2xl font-headline">إنشاء حساب جديد</CardTitle>
                <CardDescription>
                    اختر نوع الحساب الذي تريد إنشاؤه.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => onSelect('student')}>
                    <User className="h-8 w-8" />
                    <span className="font-semibold">إنشاء حساب طالب</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => onSelect('teacher')}>
                    <GraduationCap className="h-8 w-8" />
                     <span className="font-semibold">إنشاء حساب معلم</span>
                </Button>
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

function RegisterPageContent() {
    const [accountType, setAccountType] = useState<'student' | 'teacher' | null>(null);

    if (accountType === 'student') {
        return <StudentRegisterForm />;
    }

    if (accountType === 'teacher') {
        return <TeacherRegisterForm onBack={() => setAccountType(null)} />;
    }

    return <RegisterTypeSelection onSelect={setAccountType} />;
}


export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-secondary"><CatLoader /></div>}>
            <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
                <RegisterPageContent />
            </div>
        </Suspense>
    );
}
