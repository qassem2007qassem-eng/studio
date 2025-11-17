
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Lock, Palette, Shield, User, Users, Verified } from "lucide-react";
import { useUser, initializeFirebase } from "@/firebase";
import { signOut, updateProfile as updateAuthProfile } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { type User as UserType } from "@/lib/types";
import { getCurrentUserProfile, updateProfile } from "@/services/user-service";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { createReport } from "@/services/report-service";
import { CatLoader } from "@/components/cat-loader";


function ProfileSettingsCard() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();

    const [userData, setUserData] = useState<UserType | null>(null);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (!isUserLoading && user) {
            getCurrentUserProfile().then(profile => {
                if (profile) {
                    const data = profile as UserType;
                    setUserData(data);
                    setName(data.name || '');
                    setUsername(data.username || '');
                    setBio(data.bio || '');
                }
                 setIsLoading(false);
            }).catch(() => setIsLoading(false));
        } else if (!isUserLoading) {
            setIsLoading(false);
        }
    }, [user, isUserLoading]);

    const handleSaveChanges = async () => {
        if (!user || !userData) return;

        setIsSaving(true);
        try {
            const profileUpdates: Partial<User> = { name, username, bio };
            
            await updateProfile(
                user.uid,
                profileUpdates
            );

            if (auth.currentUser) {
                await updateAuthProfile(auth.currentUser, {
                    displayName: name,
                });
            }
            
            toast({
                title: "تم الحفظ",
                description: "تم تحديث معلومات ملفك الشخصي بنجاح.",
            });
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast({
                title: "خطأ في التحديث",
                description: error.message || "حدث خطأ أثناء تحديث ملفك الشخصي.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>الملف الشخصي</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
                <CardFooter>
                     <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>الملف الشخصي</CardTitle>
                <CardDescription>قم بتحديث معلوماتك الشخصية هنا.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving}/>
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="username">اسم المستخدم</Label>
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isSaving} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bio">النبذة التعريفية</Label>
                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="أخبرنا عن نفسك..." disabled={isSaving}/>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <CatLoader className="h-10 w-10 mx-auto" /> : "حفظ التغييرات"}
                </Button>
            </CardFooter>
        </Card>
    );
}

function AccountSettingsCard() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [isRequestingVerification, setIsRequestingVerification] = useState(false);


    useEffect(() => {
        if (!isUserLoading && user) {
            getCurrentUserProfile().then(profile => {
                if (profile) {
                    setIsPrivate(profile.isPrivate || false);
                }
                setIsLoading(false);
            });
        } else if (!isUserLoading) {
            setIsLoading(false);
        }
    }, [user, isUserLoading]);

    const handlePrivacyChange = async (checked: boolean) => {
        if (!user) return;
        setIsSaving(true);
        setIsPrivate(checked);
        try {
            await updateProfile(user.uid, { isPrivate: checked });
            toast({
                title: "تم تحديث الخصوصية",
                description: `حسابك الآن ${checked ? 'خاص' : 'عام'}.`,
            });
        } catch (error: any) {
            toast({ title: "خطأ", description: error.message, variant: 'destructive' });
            setIsPrivate(!checked); // Revert on error
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleRequestVerification = async () => {
        if (!user) return;
        setIsRequestingVerification(true);
        try {
            await createReport({
                reportedEntityId: user.uid,
                reportedEntityType: 'verification_request',
                reason: 'طلب توثيق الحساب',
            });
            toast({
                title: 'تم إرسال الطلب',
                description: 'تم إرسال طلب التوثيق الخاص بك إلى المشرفين للمراجعة.',
            });
        } catch (error: any) {
            toast({ title: 'خطأ', description: 'فشل إرسال طلب التوثيق.', variant: 'destructive' });
        } finally {
            setIsRequestingVerification(false);
        }
    };

     if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>الحساب</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <Skeleton className="h-16 w-full" />
                     <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader><CardTitle>إعدادات الحساب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="private-account" className="text-base flex items-center gap-2">
                           <Lock /> حساب خاص
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            إذا كان حسابك خاصًا، فلن يرى منشوراتك إلا متابعوك.
                        </p>
                    </div>
                    <Switch
                        id="private-account"
                        checked={isPrivate}
                        onCheckedChange={handlePrivacyChange}
                        disabled={isSaving || isLoading}
                    />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="verification-request" className="text-base flex items-center gap-2">
                           <Verified/> توثيق الحساب
                        </Label>
                        <p className="text-sm text-muted-foreground">
                           اطلب علامة التوثيق الزرقاء بجانب اسمك.
                        </p>
                    </div>
                     <Button onClick={handleRequestVerification} disabled={isRequestingVerification}>
                        {isRequestingVerification ? <CatLoader className="h-10 w-10" /> : "إرسال طلب"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


export default function SettingsPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { auth } = initializeFirebase();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);
    const isAdmin = user?.email === 'admin@app.com';
    const isTeacher = user?.email?.endsWith('@teacher.app.com');

    const handleLogout = async (saveInfo: boolean) => {
        setIsLoggingOut(true);
        try {
            const profile = await getCurrentUserProfile();
            if (profile) {
                let savedUsers: any[] = [];
                const savedUsersRaw = localStorage.getItem('savedUsers');
                if (savedUsersRaw) {
                    savedUsers = JSON.parse(savedUsersRaw);
                }
                
                savedUsers = savedUsers.filter((u: any) => u.email !== profile.email);

                if (saveInfo) {
                    const userToSave = {
                        email: profile.email,
                        name: profile.name,
                    };
                    savedUsers.unshift(userToSave);
                }
                
                savedUsers = savedUsers.slice(0, 5);

                localStorage.setItem('savedUsers', JSON.stringify(savedUsers));
            }
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error("Logout error", error);
        } finally {
            setIsLoggingOut(false);
            setIsLogoutAlertOpen(false);
        }
    };


    if (isUserLoading) {
         return (
             <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <CatLoader />
            </div>
        )
    }

    if (!user) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>الرجاء تسجيل الدخول</CardTitle>
                    <CardDescription>يجب عليك تسجيل الدخول لعرض هذه الصفحة.</CardDescription>
                </CardHeader>
                 <CardFooter>
                    <Button onClick={() => router.push('/login')}>تسجيل الدخول</Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">الإعدادات</h1>

            <ProfileSettingsCard />
            <AccountSettingsCard />

            <Card>
                 <CardHeader>
                    <CardTitle>الإعدادات العامة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Palette className="h-5 w-5 text-muted-foreground" />
                            <Label htmlFor="theme-switcher">المظهر</Label>
                        </div>
                        <ThemeToggle />
                    </div>
                     <Separator />
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <Label>المجتمع</Label>
                        </div>
                        <Button asChild variant="secondary" size="sm">
                            <Link href="/home/friends">
                                عرض الأصدقاء والمتابعين
                            </Link>
                        </Button>
                    </div>
                     {(isAdmin || isTeacher) && (
                        <>
                            <Separator />
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                     <Shield className="h-5 w-5 text-muted-foreground" />
                                     <div className="space-y-1">
                                        <p className="font-medium">
                                            {isAdmin ? "لوحة تحكم المشرفين" : "لوحة تحكم المعلمين"}
                                        </p>
                                     </div>
                                </div>
                                <Button asChild variant="secondary" size="sm">
                                    <Link href={isAdmin ? "/home/admin" : "/home/teacher"}>
                                        الانتقال إلى لوحة التحكم
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                    <Separator />
                     <Button variant="ghost" className="w-full justify-start gap-4 text-red-500 hover:text-red-600" onClick={() => setIsLogoutAlertOpen(true)} disabled={isLoggingOut}>
                        <LogOut className="h-5 w-5" />
                        <span>{isLoggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
                    </Button>
                </CardContent>
            </Card>
             <AlertDialog open={isLogoutAlertOpen} onOpenChange={setIsLogoutAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تسجيل الخروج</AlertDialogTitle>
                        <AlertDialogDescription>
                            هل تريد حفظ معلومات تسجيل الدخول الخاصة بك لهذا الجهاز؟
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-3 sm:gap-2 gap-2">
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleLogout(false)} className="sm:col-start-2">
                            لا، خروج فقط
                        </AlertDialogAction>
                        <AlertDialogAction onClick={() => handleLogout(true)}>
                            نعم، احفظ وخرج
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
