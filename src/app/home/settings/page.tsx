
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function SettingsPage() {
    const { toast } = useToast();

    const [name, setName] = useState("آلاء محمد");
    const [username, setUsername] = useState("alaa.m");
    const [bio, setBio] = useState("طالبة هندسة معلوماتية في جامعة دمشق. مهتمة بتطوير الويب والذكاء الاصطناعي. #مبرمجة_المستقبل");
    const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxzdHVkZW50JTIwcG9ydHJhaXR8ZW58MHx8fHwxNzYyOTA4ODYzfDA&ixlib=rb-4.1.0&q=80&w=1080");
    const [coverUrl, setCoverUrl] = useState("https://images.unsplash.com/flagged/photo-1554473675-d0904f3cbf38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHx1bml2ZXJzaXR5JTIwY2FtcHVzfGVufDB8fHx8MTc2Mjg5OTM2MHww&ixlib=rb-4.1.0&q=80&w=1080");
    const [isLoading, setIsLoading] = useState(false);

    const handleSaveChanges = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        toast({
            title: "تم الحفظ",
            description: "تم تحديث معلومات ملفك الشخصي بنجاح.",
        });
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


    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات الملف الشخصي</CardTitle>
                <CardDescription>قم بتحديث معلوماتك الشخصية هنا.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Cover Photo */}
                <div className="space-y-2">
                    <Label>صورة الغلاف</Label>
                    <Card className="overflow-hidden">
                         <div className="relative h-40 w-full bg-muted">
                            <Image
                                src={coverUrl}
                                alt="Cover preview"
                                fill
                                className="object-cover"
                            />
                         </div>
                    </Card>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setCoverUrl)} />
                </div>
                
                {/* Avatar */}
                <div className="space-y-2">
                    <Label>الصورة الشخصية</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={avatarUrl} alt={name} />
                            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAvatarUrl)} />
                    </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                 {/* Username */}
                 <div className="space-y-2">
                    <Label htmlFor="username">اسم المستخدم</Label>
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                    <Label htmlFor="bio">النبذة التعريفية</Label>
                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveChanges} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : "حفظ التغييرات"}
                </Button>
            </CardFooter>
        </Card>
    );
}
