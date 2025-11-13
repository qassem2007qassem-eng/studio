
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, UserCircle2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        dob: undefined as Date | undefined,
        gender: '',
        username: '',
        password: '',
        avatar: null as string | null
    });

    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const handleNext = () => setStep(prev => prev + 1);
    const handlePrev = () => setStep(prev => prev - 1);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, avatar: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    }

    const handleCreateAccount = async () => {
        setIsLoading(true);
        const email = `${formData.username.toLowerCase()}@syrianstudenthub.com`;
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
            const user = userCredential.user;
            
            let photoURL = `https://i.pravatar.cc/150?u=${user.uid}`;

            if (formData.avatar) {
                const storage = getStorage();
                const avatarRef = ref(storage, `avatars/${user.uid}`);
                const snapshot = await uploadString(avatarRef, formData.avatar, 'data_url');
                photoURL = await getDownloadURL(snapshot.ref);
            }

            await updateProfile(user, {
                displayName: formData.fullName,
                photoURL: photoURL
            });
            
            const userDocRef = doc(firestore, "users", user.uid);
            const userData = {
                id: user.uid,
                username: formData.username.toLowerCase(),
                email: user.email,
                name: formData.fullName,
                dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : null,
                gender: formData.gender,
                createdAt: serverTimestamp(),
                bio: "",
                avatarUrl: photoURL,
                coverUrl: `https://picsum.photos/seed/${user.uid}/1080/400`,
                postCount: 0,
                followerCount: 0,
                followingCount: 0,
            };

            setDocumentNonBlocking(userDocRef, userData, { merge: true });

            toast({
                title: "نجاح",
                description: "تم إنشاء حسابك بنجاح! يتم توجيهك الآن...",
            });

            router.push('/home');

        } catch (error: any) {
            setIsLoading(false);
            let description = "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.";
            if (error.code === 'auth/email-already-in-use') {
                description = 'اسم المستخدم هذا مستخدم بالفعل. الرجاء اختيار اسم آخر.';
            } else if (error.code === 'auth/weak-password') {
                description = 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
            }
            toast({
                title: "خطأ في إنشاء الحساب",
                description: description,
                variant: "destructive",
            });
        }
    };


    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="grid gap-2">
                        <Label htmlFor="fullName">الاسم الكامل</Label>
                        <Input id="fullName" name="fullName" placeholder="مثال: أحمد الصالح" required value={formData.fullName} onChange={handleChange} />
                    </div>
                );
            case 2:
                return (
                    <div className="grid gap-2">
                        <Label>تاريخ الميلاد</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !formData.dob && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.dob ? format(formData.dob, "PPP") : <span>اختر تاريخاً</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formData.dob}
                                    onSelect={(date) => setFormData(p => ({...p, dob: date}))}
                                    initialFocus
                                    captionLayout="dropdown-buttons"
                                    fromYear={1950}
                                    toYear={new Date().getFullYear() - 10}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                );
            case 3:
                return (
                    <div className="grid gap-4">
                       <Label>الجنس</Label>
                        <RadioGroup defaultValue={formData.gender} onValueChange={(value) => setFormData(p => ({...p, gender: value}))} className="flex gap-4">
                            <Label htmlFor="male" className="flex items-center gap-2 border rounded-md p-4 flex-1 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground">
                                <RadioGroupItem value="male" id="male" />
                                ذكر
                            </Label>
                            <Label htmlFor="female" className="flex items-center gap-2 border rounded-md p-4 flex-1 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground">
                                <RadioGroupItem value="female" id="female" />
                                أنثى
                            </Label>
                        </RadioGroup>
                    </div>
                );
            case 4:
                 return (
                    <div className="space-y-4 text-center">
                        <div className="mx-auto w-32 h-32">
                        <Avatar className="w-full h-full">
                            <AvatarImage src={formData.avatar || undefined} />
                            <AvatarFallback>
                                <UserCircle2 className="w-20 h-20 text-muted-foreground" />
                            </AvatarFallback>
                        </Avatar>
                        </div>
                        
                        <Label htmlFor="avatar-upload" className={cn(buttonVariants({variant: 'outline'}), "cursor-pointer")}>
                            اختر صورة
                        </Label>
                        <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                );
            case 5:
                return (
                    <div className="grid gap-2">
                        <Label htmlFor="username">اسم المستخدم</Label>
                        <Input id="username" name="username" placeholder="مثال: ahmad.k" required value={formData.username} onChange={handleChange} />
                    </div>
                );
            case 6:
                return (
                    <div className="grid gap-2">
                        <Label htmlFor="password">كلمة المرور</Label>
                        <Input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} />
                    </div>
                );
            default:
                return null;
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 1: return "ما هو اسمك الكامل؟";
            case 2: return "متى تاريخ ميلادك؟";
            case 3: return "ما هو جنسك؟";
            case 4: return "اختر صورة ملفك الشخصي";
            case 5: return "اختر اسم مستخدم";
            case 6: return "اختر كلمة مرور قوية";
            default: return "إنشاء حساب جديد";
        }
    };
    
    const isNextDisabled = () => {
        switch (step) {
            case 1: return !formData.fullName;
            case 2: return !formData.dob;
            case 3: return !formData.gender;
            case 4: return false; // Can skip
            case 5: return !formData.username;
            default: return false;
        }
    }
    
    const isFinalStep = step === 6;

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
            <Card className="mx-auto w-full max-w-sm">
                <CardHeader className="text-center">
                    <Logo className="mx-auto mb-4" />
                    <CardTitle className="text-2xl font-headline">{getStepTitle()}</CardTitle>
                    <CardDescription>
                        {step < 6 ? `الخطوة ${step} من 6` : 'الخطوة الأخيرة!'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {renderStep()}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {step > 1 && <Button variant="outline" onClick={handlePrev}>السابق</Button>}
                            
                            {step < 6 && (
                                <Button onClick={handleNext} disabled={isNextDisabled()} className={cn(step === 1 ? "col-span-2" : "", step === 4 ? "col-span-2" : "")}>
                                    {step === 4 && !formData.avatar ? "تخطى" : "التالي"}
                                </Button>
                            )}
                            
                            {step === 6 && (
                                <Button onClick={handleCreateAccount} disabled={isLoading || !formData.password} className="col-span-2">
                                     {isLoading ? <Loader2 className="animate-spin" /> : "إنشاء حساب"}
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
        </div>
    );
}
