
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function CreateStoryPage() {
    const [storyImage, setStoryImage] = useState<string | null>(null);
    const [storyText, setStoryText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

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
        if (!storyImage && !storyText) {
            toast({
                title: "خطأ",
                description: "الرجاء إضافة صورة أو كتابة نص لقصتك.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        toast({
            title: "نجاح",
            description: "تم إنشاء قصتك بنجاح!",
        });
        // Here you would typically redirect or clear the form
        setStoryImage(null);
        setStoryText("");
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>إنشاء قصة جديدة</CardTitle>
                <CardDescription>ستختفي قصتك بعد 24 ساعة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div 
                    className="relative aspect-[9/16] w-full bg-muted rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {storyImage ? (
                        <Image src={storyImage} alt="Preview" fill className="object-cover rounded-lg" />
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <ImageIcon className="h-12 w-12 mx-auto" />
                            <p>انقر لاختيار صورة</p>
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
                <div>
                    <Textarea 
                        placeholder="أضف نصاً إلى قصتك..."
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                        className="text-lg"
                        rows={4}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleCreateStory} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : "نشر القصة"}
                </Button>
            </CardFooter>
        </Card>
    );
}
