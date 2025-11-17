
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CatLoader } from '@/components/cat-loader';
import { type Course } from '@/lib/types';

export default function CreateCoursePage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = initializeFirebase();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) {
            toast({ title: 'خطأ', description: 'يجب تسجيل الدخول لإنشاء دورة.', variant: 'destructive' });
            return;
        }
        if (!title.trim()) {
            toast({ title: 'خطأ', description: 'عنوان الدورة مطلوب.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);

        try {
            const courseData: Omit<Course, 'id'> = {
                title,
                description,
                thumbnailUrl,
                teacherId: user.uid,
                lessonIds: [],
                totalDuration: 0,
                createdAt: serverTimestamp() as any,
            };

            const coursesCollection = collection(firestore, 'courses');
            const docRef = await addDoc(coursesCollection, courseData);
            
            await updateDoc(doc(firestore, 'courses', docRef.id), { id: docRef.id });

            toast({ title: 'نجاح', description: `تم إنشاء دورة "${title}" بنجاح.` });
            router.push(`/home/teacher`);
        } catch (error: any) {
            console.error("Error creating course:", error);
            toast({ title: 'خطأ في إنشاء الدورة', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>إنشاء دورة تعليمية جديدة</CardTitle>
                <CardDescription>قم بتنظيم دروسك في دورات متكاملة.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreateCourse} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">عنوان الدورة</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثال: دورة برمجة بايثون للمبتدئين"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">الوصف</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="صف ما سيتم تغطيته في هذه الدورة..."
                            disabled={isLoading}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="thumbnailUrl">رابط الصورة المصغرة للدورة (اختياري)</Label>
                        <Input
                            id="thumbnailUrl"
                            type="url"
                            value={thumbnailUrl}
                            onChange={(e) => setThumbnailUrl(e.target.value)}
                            placeholder="https://example.com/course_image.jpg"
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || !title.trim()}>
                        {isLoading ? <CatLoader className="mx-auto" /> : 'إنشاء الدورة'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

