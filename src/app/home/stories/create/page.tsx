
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser } from "@/firebase";
import { collection, serverTimestamp, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { type User as UserType } from "@/lib/types";
import { getCurrentUserProfile } from "@/services/user-service";
import { initializeFirebase } from '@/firebase';


export default function CreateStoryPage() {
    const [storyImage, setStoryImage] = useState<string | null>(null);
    const [storyText, setStoryText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const router = useRouter();

    const { firestore } = initializeFirebase();
    const { user } = useUser();
    const [userData, setUserData] = useState<UserType | null>(null);

    useEffect(() => {
        if (user) {
             getCurrentUserProfile().then(profile => {
                if (profile) {
                    setUserData(profile as UserType);
                }
            });
        }
    }, [user]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setStoryImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateStory = async () => {
        if (!storyImage || !user || !firestore || !userData) {
            toast({
                title: "خطأ",
                description: "الرجاء اختيار صورة وتسجيل الدخول أولاً.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const storage = getStorage();
            const storyRef = ref(storage, `stories/${user.uid}/${Date.now()}`);
            const snapshot = await uploadString(storyRef, storyImage, 'data_url');
            const downloadURL = await getDownloadURL(snapshot.ref);

            const storiesCollection = collection(firestore, 'stories');
            
            const storyData = {
                userId: user.uid,
                user: {
                    name: userData.name,
                    username: userData.username,
                    avatarUrl: userData.avatarUrl,
                },
                contentUrl: downloadURL,
                caption: storyText,
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                viewers: [],
            };
            
            const docRef = await addDoc(storiesCollection, storyData);
            
            toast({
                title: "نجاح",
                description: "تم نشر قصتك بنجاح!",
            });
            
            router.push(`/home/stories/${docRef.id}`);

        } catch (error) {
            console.error("Error creating story: ", error);
            toast({
                title: "خطأ",
                description: "لم نتمكن من نشر قصتك. حاول مرة أخرى.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle>إنشاء قصة جديدة</CardTitle>
                <CardDescription>ستختفي قصتك بعد 24 ساعة. يمكنك إضافة نص فوق الصورة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div 
                    className="relative aspect-[9/16] w-full bg-muted rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {storyImage ? (
                        <>
                            <Image src={storyImage} alt="Story preview" fill className="object-cover rounded-lg" />
                             <div className="absolute inset-0 bg-black/20"></div>
                             <Textarea
                                placeholder="ابدأ الكتابة..."
                                value={storyText}
                                onChange={(e) => setStoryText(e.target.value)}
                                className="absolute bottom-1/2 translate-y-1/2 w-11/12 bg-transparent border-none text-white text-2xl font-bold text-center focus-visible:ring-0 ring-offset-0 placeholder:text-gray-200"
                                rows={3}
                            />
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground p-4">
                            <ImageIcon className="h-12 w-12 mx-auto" />
                            <p className="mt-2">انقر لاختيار صورة</p>
                        </div>
                    )}
                    <Input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden"
                        onChange={handleImageChange}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleCreateStory} disabled={isLoading || !storyImage} className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : "نشر القصة"}
                </Button>
            </CardFooter>
        </Card>
    );
}
