
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
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { type User as UserType } from "@/lib/types";
import { getCurrentUserProfile, updateProfile } from "@/services/user-service";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import Link from 'next/link';


function ProfileSettings() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    const [userData, setUserData] = useState<UserType | null>(null);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (!isUserLoading && user) {
            getCurrentUserProfile().then(profile => {
                if (profile) {
                    const data = profile as UserType;
                    setUserData(data);
                    setName(data.name || '');
                    setUsername(data.username || '');
                    setBio(data.bio || '');
                    setAvatarUrl(data.avatarUrl || null);
                    setCoverUrl(data.coverUrl || null);
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
            const { auth, storage } = initializeFirebase();
            let newAvatarUrl = userData.avatarUrl;
            if (avatarUrl && avatarUrl !== userData.avatarUrl && avatarUrl.startsWith('data:image')) {
                const avatarRef = ref(storage, `avatars/${user.uid}`);
                const snapshot = await uploadString(avatarRef, avatarUrl, 'data_url');
                newAvatarUrl = await getDownloadURL(snapshot.ref);
            }

            let newCoverUrl = userData.coverUrl;
            if (coverUrl && coverUrl !== userData.coverUrl && coverUrl.startsWith('data:image')) {
                const coverRef = ref(storage, `covers/${user.uid}`);
                const snapshot = await uploadString(coverRef, coverUrl, 'data_url');
                newCoverUrl = await getDownloadURL(snapshot.ref);
            }
            
            if (auth.currentUser) {
                await updateAuthProfile(auth.currentUser, {
                    displayName: name,
                    photoURL: newAvatarUrl
                });
            }

            const updatedUserData: Partial<UserType> = {
                name: name,
                username: username.toLowerCase(),
                bio: bio,
                avatarUrl: newAvatarUrl,
                coverUrl: newCoverUrl,
            };

            await updateProfile(updatedUserData);
            
            const updatedFullUser = { ...userData, ...updatedUserData };
            setUserData(updatedFullUser as UserType);
            setAvatarUrl(updatedFullUser.avatarUrl);
            setCoverUrl(updatedFullUser.coverUrl);


            toast({
                title: "تم الحفظ",
                description: "تم تحديث معلومات ملفك الشخصي بنجاح.",
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "خطأ",
                description: "حدث خطأ أثناء تحديث ملفك الشخصي.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setter(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10" />
                        <div className="flex-1 space-y-2">
                             <Skeleton className="h-4 w-1/3" />
                             <Skeleton className="h-3 w-2/3" />
                        </div>
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
                {/* Cover Photo */}
                <div className="space-y-2">
                    <Label>صورة الغلاف</Label>
                    <Card className="overflow-hidden">
                         <div className="relative h-40 w-full bg-muted">
                            {coverUrl && 
                                <Image
                                    src={coverUrl}
                                    alt="Cover preview"
                                    fill
                                    className="object-cover"
                                />
                            }
                         </div>
                    </Card>
                    <Button variant="outline" onClick={() => coverInputRef.current?.click()} disabled={isSaving}>تغيير صورة الغلاف</Button>
                    <Input ref={coverInputRef} className="hidden" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setCoverUrl)} />
                </div>
                
                {/* Avatar */}
                <div className="space-y-2">
                    <Label>الصورة الشخصية</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={avatarUrl || undefined} alt={name} />
                            <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={isSaving}>تغيير الصورة الشخصية</Button>
                        <Input ref={avatarInputRef} className="hidden" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAvatarUrl)} />
                    </div>
                </div>

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
    const isAdmin = user?.email === 'admin@app.com';

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error("Logout error", error);
        } finally {
            setIsLoggingOut(false);
        }
    }

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
                     <Button variant="ghost" className="w-full justify-start gap-4 text-red-500 hover:text-red-600" onClick={handleLogout} disabled={isLoggingOut}>
                        <LogOut className="h-5 w-5" />
                        <span>{isLoggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
