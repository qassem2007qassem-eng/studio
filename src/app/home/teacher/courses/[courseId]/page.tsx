
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type Course, type Lesson } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, PlayCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    let result = '';
    if (h > 0) result += `${h} س `;
    if (m > 0) result += `${m} د`;
    return result.trim() || '0 د';
}


export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
    const { firestore } = initializeFirebase();
    
    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!courseId || !firestore) return;
        
        setIsLoading(true);
        const courseRef = doc(firestore, 'courses', courseId);

        const unsubscribeCourse = onSnapshot(courseRef, (doc) => {
            if (doc.exists()) {
                setCourse({ id: doc.id, ...doc.data() } as Course);
            } else {
                setCourse(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching course details:", error);
            setIsLoading(false);
        });

        const fetchLessons = async () => {
             const lessonsQuery = query(collection(firestore, 'lessons'), where('courseId', '==', courseId), orderBy('createdAt', 'asc'));
             const lessonsSnapshot = await getDocs(lessonsQuery);
             setLessons(lessonsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Lesson)));
        }
        fetchLessons();


        return () => unsubscribeCourse();
    }, [courseId, firestore]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    if (!course) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <h2 className="text-2xl font-bold">الدورة غير موجودة</h2>
                    <p className="text-muted-foreground">عذراً، لم نتمكن من العثور على هذه الدورة.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden">
                {course.thumbnailUrl && <div className="relative h-48 w-full bg-muted"><img src={course.thumbnailUrl} alt={course.title} className="object-cover w-full h-full" /></div>}
                 <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                         <div>
                            <h1 className="text-2xl font-bold font-headline">{course.title}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>المدة الإجمالية: {formatDuration(course.totalDuration || 0)}</span>
                            </div>
                        </div>
                         <Button onClick={() => router.push('/home/teacher/create-lesson')}>
                            <PlusCircle className="me-2"/> إضافة درس جديد
                        </Button>
                    </div>
                     <p className="mt-4 text-muted-foreground">{course.description}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>دروس الدورة ({lessons.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {lessons.length > 0 ? (
                        <div className="space-y-4">
                            {lessons.map((lesson, index) => (
                                <Link href={`/lessons/${lesson.id}`} key={lesson.id} className={cn("flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors")}>
                                    <span className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 1}</span>
                                    <Avatar className="h-16 w-28 rounded-md" variant="square">
                                        <AvatarImage src={lesson.thumbnailUrl} alt={lesson.title} className="object-cover"/>
                                        <AvatarFallback className="rounded-md bg-secondary flex items-center justify-center">
                                            <PlayCircle className="text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-semibold">{lesson.title}</p>
                                        <p className="text-sm text-muted-foreground">{formatDuration(lesson.duration)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-6">لم يتم إضافة أي دروس لهذه الدورة بعد.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
      variant?: string;
    }
}
