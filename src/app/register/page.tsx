
'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2, UserCircle2, CheckCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth, initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    dob: undefined as Date | undefined,
    gender: '',
    username: '',
    password: '',
    avatar: null as string | null,
  });
  const [usernameError, setUsernameError] = useState<string | null>(null);


  const { auth, firestore, storage } = initializeFirebase();
  const { toast } = useToast();

  useEffect(() => {
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const avatar = searchParams.get('avatar');

    if (name && email) {
      setFormData(prev => ({
        ...prev,
        fullName: name,
        email: email,
        avatar: avatar || null,
      }));
      setStep(3);
    }
  }, [searchParams]);

  const isFromGoogle = !!searchParams.get('email');

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          avatar: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
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

      // Send verification email
      await sendEmailVerification(user);

      let photoURL = "";
      if (formData.avatar) {
        const avatarRef = ref(storage, `avatars/${user.uid}`);
        const snapshot = await uploadString(
          avatarRef,
          formData.avatar,
          'data_url'
        );
        photoURL = await getDownloadURL(snapshot.ref);
      }

      await updateProfile(user, {
        displayName: formData.fullName,
        photoURL: photoURL,
      });

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        id: user.uid,
        username: usernameLower,
        email: formData.email,
        name: formData.fullName,
        dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : null,
        gender: formData.gender,
        createdAt: serverTimestamp(),
        bio: '',
        avatarUrl: photoURL,
        coverUrl: "",
        followers: [],
        following: [],
        emailVerified: user.emailVerified
      });
      
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
        description: description,
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
            disabled={isFromGoogle}
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
            disabled={isFromGoogle}
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
      title: 'اختر صورة ملفك الشخصي',
      field: 'avatar',
      validation: () => true, // Optional step
      content: (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-32 h-32">
            <Avatar className="w-full h-full">
              <AvatarImage src={formData.avatar || undefined} />
              <AvatarFallback>
                <UserCircle2 className="w-20 h-20 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </div>

          <Label
            htmlFor="avatar-upload"
            className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer', isFromGoogle && 'hidden')}
          >
            اختر صورة
          </Label>
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isFromGoogle}
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
        </div>
      ),
    },
  ].filter(s => !(isFromGoogle && ['email', 'fullName', 'password'].includes(s.field)));


  const currentStepData = stepsContent[step - (isFromGoogle ? 3 : 1)];
  if (!currentStepData) {
      // Handle case where step is out of bounds, maybe redirect or show error
      return <div>خطأ: خطوة غير صالحة</div>
  }
  const isFinalStep = step === stepsContent.length + (isFromGoogle ? 2 : 0);
  
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mx-auto mb-4" />
        <CardTitle className="text-2xl font-headline">{currentStepData.title}</CardTitle>
        <CardDescription>
          {isFinalStep
            ? 'الخطوة الأخيرة!'
            : `الخطوة ${step} من ${stepsContent.length + (isFromGoogle ? 2 : 0)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {currentStepData.content}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {step > 1 && (
              <Button variant="outline" onClick={handlePrev}>
                السابق
              </Button>
            )}

            {!isFinalStep && (
              <Button
                onClick={handleNext}
                disabled={!currentStepData.validation()}
                className={cn(step === 1 ? 'col-span-2' : '', (step === 5 && !isFromGoogle) ? 'col-span-2' : '', (step === 3 && isFromGoogle) ? 'col-span-2' : '')}
              >
                {step === 5 && !formData.avatar && !isFromGoogle ? 'تخطى' : 'التالي'}
              </Button>
            )}

            {isFinalStep && (
              <Button
                onClick={handleCreateAccount}
                disabled={isLoading || !currentStepData.validation()}
                className="col-span-2"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'إنشاء حساب'}
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
        <Suspense fallback={<div>Loading...</div>}>
            <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
                <RegisterForm />
            </div>
        </Suspense>
    );
}
