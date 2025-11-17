
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type Lesson, type Teacher, type User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { getTeachersByIds } from '@/services/user-service';

function formatDuration(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return '0 د';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    let result = '';
    if (h > 0) result += `${h} س `;
    if (m > 0) result += `${m} د`;
    return result.trim() || '0 د';
}

function LessonSkeleton() {
    return (
        <Card className="overflow-hidden">
            <div className="relative aspect-video bg-muted">
                <Skeleton className="w-full h-full" />
            </div>
            <CardHeader className="p-3 space-y-2">
                <Skeleton className="h-5 w-4/5" />
                 <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-1/3" />
                </div>
            </CardHeader>
        </Card>
    );
}

export default function ContentPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [teachers, setTeachers] = useState<Record<string, User>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { firestore } = initializeFirebase();

    useEffect(() => {
        const fetchLatestLessons = async () => {
            setIsLoading(true);
            const lessonsQuery = query(collection(firestore, 'lessons'), orderBy('createdAt', 'desc'), limit(50));
            try {
                const snapshot = await getDocs(lessonsQuery);
                const fetchedLessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
                setLessons(fetchedLessons);

                if (fetchedLessons.length > 0) {
                    const teacherIds = [...new Set(fetchedLessons.map(l => l.teacherId))];
                    const teacherData = await getTeachersByIds(teacherIds);
                    const teacherMap = teacherData.reduce((acc, teacher) => {
                        acc[teacher.id] = teacher;
                        return acc;
                    }, {} as Record<string, User>);
                    setTeachers(teacherMap);
                }

            } catch (error) {
                console.error("Error fetching latest lessons: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLatestLessons();
    }, [firestore]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>أحدث المحتوى التعليمي</CardTitle>
                    <CardDescription>اكتشف آخر الدروس التي تمت إضافتها من قبل المعلمين.</CardDescription>
                </CardHeader>
            </Card>
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <LessonSkeleton key={i} />)}
                </div>
            ) : lessons.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12 text-muted-foreground">
                        <PlayCircle className="h-16 w-16 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">لا يوجد محتوى تعليمي بعد</h3>
                        <p>سيظهر المحتوى الجديد هنا عند إضافته من قبل المعلمين.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lessons.map(lesson => {
                        const teacher = teachers[lesson.teacherId];
                        return (
                        <Card key={lesson.id} className="overflow-hidden">
                            <Link href={`/lessons/${lesson.id}`} className="block">
                                <div className="relative aspect-video bg-secondary">
                                    {lesson.thumbnailUrl ? (
                                        <img src={lesson.thumbnailUrl} alt={lesson.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <PlayCircle className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                        {formatDuration(lesson.duration)}
                                    </div>
                                </div>
                            </Link>
                            <CardHeader className="p-3">
                                <CardTitle className="text-base font-semibold leading-tight truncate hover:underline">
                                    <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
                                </CardTitle>
                                {teacher && (
                                     <div className="flex items-center gap-2 pt-1">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={(teacher as any).profilePictureUrl} alt={teacher.name} />
                                            <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground font-medium hover:underline">
                                             <Link href={`/home/profile/${teacher.username.toLowerCase()}`}>{teacher.name}</Link>
                                        </span>
                                    </div>
                                )}
                            </CardHeader>
                        </Card>
                    )})}
                </div>
            )}
        </div>
    );
}
