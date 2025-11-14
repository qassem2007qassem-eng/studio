
'use client';

import Link from 'next/link';
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
import { useState, useEffect } from 'react';
import { useAuth, useFirebase, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 48 48" {...props}>
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.596,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

interface SavedUser {
    email: string;
    name: string;
    avatarUrl?: string;
}

const SpecificUserLogin = ({ user, onBack }: { user: SavedUser, onBack: () => void }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = useFirebase();

    const ADMIN_EMAIL = 'admin@app.com';

     const handleLogin = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!user.email || !password) {
            toast({ title: 'خطأ', description: 'الرجاء إدخال كلمة المرور.', variant: 'destructive' });
            return;
        }
        setIsLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, user.email, password);
            const loggedInUser = userCredential.user;

             if (!loggedInUser.emailVerified && loggedInUser.email?.toLowerCase() !== ADMIN_EMAIL) {
                await auth.signOut();
                toast({
                    title: 'التحقق من البريد الإلكتروني',
                    description: 'الرجاء التحقق من بريدك الإلكتروني أولاً. لقد أرسلنا لك رابط التحقق.',
                    variant: 'default'
                });
                setIsLoading(false);
                return;
            }
            
            router.push('/home');

        } catch (error: any) {
            let description = 'كلمة المرور غير صحيحة.';
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
         <Card className="mx-auto w-full max-w-sm">
            <CardHeader className="text-center">
                <Avatar className="mx-auto mb-4 h-24 w-24">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl font-headline">أهلاً بعودتك، {user.name?.split(' ')[0]}</CardTitle>
                <CardDescription>
                    أدخل كلمة المرور للمتابعة
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                 <form onSubmit={handleLogin} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="password">كلمة المرور</Label>
                        <Input
                        id="password"
                        type="password"
                        required
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'تسجيل الدخول'}
                    </Button>
                </form>
                <Button variant="link" onClick={onBack} className="w-full">
                   تسجيل الدخول بحساب آخر
                </Button>
            </CardContent>
        </Card>
    )
}


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const auth = useAuth();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [savedUsers, setSavedUsers] = useState<SavedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SavedUser | null>(null);

  const ADMIN_EMAIL = 'admin@app.com';

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/home');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!user) {
        const savedUsersJson = localStorage.getItem('savedUsers');
        if (savedUsersJson) {
            const parsedUsers = JSON.parse(savedUsersJson);
            setSavedUsers(parsedUsers);
        }
    }
  }, [user]);

  if (selectedUser) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
            <SpecificUserLogin user={selectedUser} onBack={() => setSelectedUser(null)} />
          </div>
      );
  }

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      if (!loggedInUser.emailVerified && loggedInUser.email?.toLowerCase() !== ADMIN_EMAIL) {
        await auth.signOut();
        toast({
            title: 'التحقق من البريد الإلكتروني',
            description: 'الرجاء التحقق من بريدك الإلكتروني أولاً. لقد أرسلنا لك رابط التحقق.',
            variant: 'default'
        });
        setIsLoading(false);
        return;
      }
      
      router.push('/home');

    } catch (error: any) {
      let description = 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-email'
      ) {
        description = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
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
  

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      const userDocRef = doc(firestore, 'users', googleUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
            id: googleUser.uid,
            username: googleUser.email?.split('@')[0] || `user_${Date.now()}`.toLowerCase(),
            email: googleUser.email,
            name: googleUser.displayName,
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
            isPrivate: false,
            emailVerified: googleUser.emailVerified
        });
      }
      
      router.push('/home');

    } catch (error: any) {
      console.error("Google sign-in error:", error);
      let description = "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.";
      if(error.code === 'auth/operation-not-allowed') {
        description = "تسجيل الدخول عبر جوجل غير مفعل حالياً. الرجاء الاتصال بالدعم."
      }
      toast({
        title: "خطأ في تسجيل الدخول عبر Google",
        description: description,
        variant: "destructive"
      });
    } finally {
        setIsGoogleLoading(false);
    }
  };


  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-headline">تسجيل الدخول</CardTitle>
          <CardDescription>
            اختر حسابًا أو سجل الدخول
          </CardDescription>
        </CardHeader>
        <CardContent>
            {savedUsers.length > 0 && (
                <>
                    <div className="mb-4">
                        <h3 className="text-center text-sm font-medium text-muted-foreground mb-4">تسجيلات الدخول الأخيرة</h3>
                        <div className="flex justify-center gap-4 flex-wrap">
                            {savedUsers.map((savedUser, index) => (
                                <div key={index} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setSelectedUser(savedUser)}>
                                    <Avatar className="h-16 w-16 border-2 border-transparent hover:border-primary">
                                        <AvatarImage src={savedUser.avatarUrl} alt={savedUser.name} />
                                        <AvatarFallback>{savedUser.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium">{savedUser.name.split(' ')[0]}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">أو</span>
                        </div>
                    </div>
                </>
            )}

          <div className="grid gap-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
              {isGoogleLoading ? <Loader2 className="animate-spin" /> : <><GoogleIcon className="me-2 h-4 w-4" /> متابعة باستخدام Google</>}
            </Button>
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">أو</span>
                </div>
            </div>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ahmad@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'تسجيل الدخول'}
              </Button>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="underline">
              إنشاء حساب
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
