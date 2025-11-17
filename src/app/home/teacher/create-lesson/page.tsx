
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs, getDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { type Lesson, type Course } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function CreateLessonForm() {
    const { user } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { firestore } = initializeFirebase();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [duration, setDuration] = useState(0);
    const [courseId, setCourseId] = useState(searchParams.get('courseId') || '');
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCoursesLoading, setIsCoursesLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchCourses = async () => {
                setIsCoursesLoading(true);
                const coursesQuery = query(collection(firestore, 'courses'), where('teacherId', '==', user.uid));
                const querySnapshot = await getDocs(coursesQuery);
                setCourses(querySnapshot.docs.map(doc => doc.data() as Course));
                setIsCoursesLoading(false);
            };
            fetchCourses();
        }
    }, [user, firestore]);

    const handleCreateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) {
            toast({ title: 'خطأ', description: 'يجب تسجيل الدخول لإنشاء درس.', variant: 'destructive' });
            return;
        }
        if (!title.trim() || !videoUrl.trim() || !courseId || duration <= 0) {
            toast({ title: 'خطأ', description: 'الرجاء ملء جميع الحقول المطلوبة.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);

        try {
            const lessonData: Omit<Lesson, 'id'> = {
                title,
                description,
                videoUrl,
                thumbnailUrl,
                duration: duration * 60, // Convert minutes to seconds
                courseId,
                teacherId: user.uid,
                views: 0,
                likes: [],
                createdAt: serverTimestamp() as any,
            };

            const lessonsCollection = collection(firestore, 'lessons');
            const docRef = await addDoc(lessonsCollection, lessonData);
            
            await updateDoc(docRef, { id: docRef.id });

            const courseRef = doc(firestore, 'courses', courseId);
            const courseSnap = await getDoc(courseRef);
            if (courseSnap.exists()) {
                const courseData = courseSnap.data() as Course;
                const newTotalDuration = (courseData.totalDuration || 0) + (duration * 60);
                await updateDoc(courseRef, { 
                    totalDuration: newTotalDuration,
                    lessonIds: arrayUnion(docRef.id)
                });
            }

            toast({ title: 'نجاح', description: `تم إنشاء درس "${title}" بنجاح.` });
            router.push(`/home/teacher/courses/${courseId}`);
        } catch (error: any) {
            console.error("Error creating lesson:", error);
            toast({ title: 'خطأ في إنشاء الدرس', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>إضافة درس جديد</CardTitle>
                <CardDescription>قم بملء تفاصيل الدرس الجديد الخاص بك.</CardDescription>
            </CardHeader>
             <form onSubmit={handleCreateLesson}>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">عنوان الدرس</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مقدمة في البرمجة" required disabled={isLoading} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="course">اختر الدورة</Label>
                        <Select onValueChange={setCourseId} value={courseId} required disabled={isLoading || isCoursesLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={isCoursesLoading ? "جاري تحميل الدورات..." : "اختر دورة لوضع الدرس فيها"} />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map(course => (
                                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">وصف الدرس (اختياري)</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="صف ما سيتم تغطيته في هذا الدرس..." disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="videoUrl">رابط الفيديو</Label>
                        <Input id="videoUrl" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." required disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="thumbnailUrl">رابط الصورة المصغرة (اختياري)</Label>
                        <Input id="thumbnailUrl" type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://example.com/image.jpg" disabled={isLoading} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="duration">مدة الفيديو (بالدقائق)</Label>
                        <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="15" required min="1" disabled={isLoading} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading || isCoursesLoading || !courseId}>
                        {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'إضافة الدرس'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function CreateLessonPage() {
    return (
        <Suspense fallback={<div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-10 w-full" /></div>}>
            <CreateLessonForm />
        </Suspense>
    )
}
