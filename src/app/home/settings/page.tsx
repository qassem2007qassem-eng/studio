
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Moon, Sun, LogOut, Lock, UserCog, Palette, Shield } from "lucide-react";
import Image from "next/image";
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
import { Progress } from "@/components/ui/progress";


function ProfileSettings() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const { auth } = initializeFirebase();
    const router = useRouter();

    const [userData, setUserData] = useState<UserType | null>(null);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    
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
                    setIsPrivate(data.isPrivate || false);
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
            const profileUpdates: Partial<User> = { name, username, bio, isPrivate };
            
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
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                         <Skeleton className="h-4 w-1/4" />
                         <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>تعديل الملف الشخصي</CardTitle>
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
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="private-account" className="text-base">حساب خاص</Label>
                        <p className="text-sm text-muted-foreground">
                            إذا كان حسابك خاصًا، فلن يتمكن من رؤية منشوراتك إلا الأشخاص الذين توافق عليهم.
                        </p>
                    </div>
                    <Switch
                        id="private-account"
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                        disabled={isSaving}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin" /> : "حفظ التغييرات"}
                </Button>
            </CardFooter>
        </Card>
    );
}

function ThemeSettings() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="theme-switcher">المظهر</Label>
            </div>
            <div className="flex items-center gap-2 rounded-full border p-1">
                <Button variant={theme === 'light' ? 'secondary': 'ghost'} size="icon" className="rounded-full h-8 w-8" onClick={() => setTheme('light')}>
                    <Sun className="h-5 w-5"/>
                </Button>
                 <Button variant={theme === 'dark' ? 'secondary': 'ghost'} size="icon" className="rounded-full h-8 w-8" onClick={() => setTheme('dark')}>
                    <Moon className="h-5 w-5"/>
                </Button>
            </div>
        </div>
    )
}


export default function SettingsPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { auth } = initializeFirebase();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);
    const isAdmin = user?.email === 'admin@app.com';

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
                <Loader2 className="h-8 w-8 animate-spin" />
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
            <ProfileSettings />

            <Card>
                 <CardHeader>
                    <CardTitle>الإعدادات العامة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ThemeSettings />
                     {isAdmin && (
                        <>
                            <Separator />
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                     <Shield className="h-5 w-5 text-muted-foreground" />
                                     <div className="space-y-1">
                                        <p className="font-medium">لوحة تحكم المشرفين</p>
                                     </div>
                                </div>
                                <Button asChild variant="secondary" size="sm">
                                    <Link href="/home/admin">
                                        الذهاب إلى لوحة التحكم
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
