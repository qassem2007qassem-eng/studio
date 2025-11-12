
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        dob: undefined as Date | undefined,
        gender: '',
        username: '',
        password: ''
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

    const handleCreateAccount = async () => {
        setIsLoading(true);
        // Create a fake email from username for Firebase Auth
        const email = `${formData.username.toLowerCase()}@syrianstudenthub.com`;
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
            const user = userCredential.user;

            // Update user profile
            await updateProfile(user, {
                displayName: formData.fullName,
                // You can generate a default photoURL here
            });
            
            // Save user data to Firestore
            const userDocRef = doc(firestore, "users", user.uid);
            const userData = {
                id: user.uid,
                username: formData.username,
                email: user.email,
                fullName: formData.fullName,
                dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : null,
                gender: formData.gender,
                createdAt: new Date().toISOString(),
                bio: "",
                profilePictureUrl: `https://i.pravatar.cc/150?u=${user.uid}`,
                coverPhotoUrl: `https://picsum.photos/seed/${user.uid}/1080/400`,
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
                    <div className="grid gap-2">
                        <Label htmlFor="username">اسم المستخدم</Label>
                        <Input id="username" name="username" placeholder="مثال: ahmad.k" required value={formData.username} onChange={handleChange} />
                    </div>
                );
            case 5:
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
            case 4: return "اختر اسم مستخدم";
            case 5: return "اختر كلمة مرور قوية";
            default: return "إنشاء حساب جديد";
        }
    };
    
    const isNextDisabled = () => {
        switch (step) {
            case 1: return !formData.fullName;
            case 2: return !formData.dob;
            case 3: return !formData.gender;
            case 4: return !formData.username;
            default: return false;
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
            <Card className="mx-auto w-full max-w-sm">
                <CardHeader className="text-center">
                    <Logo className="mx-auto mb-4" />
                    <CardTitle className="text-2xl font-headline">{getStepTitle()}</CardTitle>
                    <CardDescription>
                        {step < 5 ? `الخطوة ${step} من 5` : 'الخطوة الأخيرة!'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {renderStep()}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {step > 1 && <Button variant="outline" onClick={handlePrev}>السابق</Button>}
                            
                            {step < 5 && <Button onClick={handleNext} disabled={isNextDisabled()} className={step === 1 ? "col-span-2" : ""}>التالي</Button>}
                            
                            {step === 5 && (
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
