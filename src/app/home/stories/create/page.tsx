
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2, Type } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useUser, initializeFirebase } from "@/firebase";
import { collection, serverTimestamp, addDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { getCurrentUserProfile } from "@/services/user-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";


const textStoryBackgrounds = [
    "bg-gradient-to-br from-blue-500 to-purple-600",
    "bg-gradient-to-br from-green-400 to-teal-500",
    "bg-gradient-to-br from-yellow-400 to-orange-500",
    "bg-gradient-to-br from-pink-500 to-rose-500",
    "bg-gradient-to-br from-indigo-500 to-violet-600",
];

export default function CreateStoryPage() {
    const [storyType, setStoryType] = useState<"image" | "text">("image");
    const [storyImage, setStoryImage] = useState<string | null>(null);
    const [storyText, setStoryText] = useState("");
    const [selectedBg, setSelectedBg] = useState(textStoryBackgrounds[0]);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();

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
        const profile = await getCurrentUserProfile();
        if (!user || !profile) {
            toast({ title: "خطأ", description: "الرجاء تسجيل الدخول أولاً.", variant: "destructive" });
            return;
        }

        if (storyType === "image" && !storyImage) {
            toast({ title: "خطأ", description: "الرجاء اختيار صورة لقصتك.", variant: "destructive" });
            return;
        }
        if (storyType === "text" && !storyText.trim()) {
            toast({ title: "خطأ", description: "الرجاء كتابة نص لقصتك.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const { firestore, storage } = initializeFirebase();
            const storiesCollection = collection(firestore, 'stories');
            let storyData: any;
            
            const baseStoryData = {
                userId: user.uid,
                user: {
                    name: profile.name,
                    username: profile.username,
                    avatarUrl: profile.avatarUrl,
                },
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                viewers: [],
            };
            
            if (storyType === 'image' && storyImage) {
                const storyRef = ref(storage, `stories/${user.uid}/${Date.now()}`);
                const snapshot = await uploadString(storyRef, storyImage, 'data_url');
                const downloadURL = await getDownloadURL(snapshot.ref);

                storyData = {
                    ...baseStoryData,
                    type: 'image',
                    contentUrl: downloadURL,
                };
            } else if (storyType === 'text') {
                 storyData = {
                    ...baseStoryData,
                    type: 'text',
                    text: storyText.trim(),
                    backgroundColor: selectedBg,
                };
            }

            const docRef = await addDoc(storiesCollection, storyData);
            
            toast({ title: "نجاح", description: "تم نشر قصتك بنجاح!" });
            router.push(`/home/stories/${docRef.id}`);

        } catch (error) {
            console.error("Error creating story: ", error);
            toast({ title: "خطأ", description: "لم نتمكن من نشر قصتك. حاول مرة أخرى.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle>إنشاء قصة جديدة</CardTitle>
                <CardDescription>ستختفي قصتك بعد 24 ساعة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Tabs value={storyType} onValueChange={(value) => setStoryType(value as "image" | "text")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="image"><ImageIcon className="me-2"/>صورة</TabsTrigger>
                        <TabsTrigger value="text"><Type className="me-2"/>نص</TabsTrigger>
                    </TabsList>
                    <TabsContent value="image" className="mt-4">
                        <div 
                            className="relative aspect-[9/16] w-full bg-muted rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {storyImage ? (
                                <>
                                    <Image src={storyImage} alt="Story preview" fill className="object-cover rounded-lg" />
                                </>
                            ) : (
                                <div className="text-center text-muted-foreground p-4">
                                    <ImageIcon className="h-12 w-12 mx-auto" />
                                    <p className="mt-2">انقر لاختيار صورة</p>
                                </div>
                            )}
                        </div>
                        <Input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </TabsContent>
                    <TabsContent value="text" className="mt-4">
                        <div className={cn("relative aspect-[9/16] w-full rounded-lg flex items-center justify-center", selectedBg)}>
                             <Textarea
                                placeholder="ابدأ الكتابة..."
                                value={storyText}
                                onChange={(e) => setStoryText(e.target.value)}
                                className="bg-transparent border-none text-white text-3xl font-bold text-center focus-visible:ring-0 ring-offset-0 placeholder:text-gray-200 resize-none"
                                rows={5}
                            />
                        </div>
                         <div className="flex gap-2 mt-4">
                            {textStoryBackgrounds.map(bg => (
                                <div 
                                    key={bg}
                                    className={cn("w-8 h-8 rounded-full cursor-pointer border-2", bg, selectedBg === bg ? 'border-ring' : 'border-transparent')}
                                    onClick={() => setSelectedBg(bg)}
                                />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter>
                <Button onClick={handleCreateStory} disabled={isSaving || (storyType === 'image' && !storyImage) || (storyType === 'text' && !storyText.trim())}>
                    {isSaving ? <Loader2 className="animate-spin" /> : "نشر القصة"}
                </Button>
            </CardFooter>
        </Card>
    );
}
