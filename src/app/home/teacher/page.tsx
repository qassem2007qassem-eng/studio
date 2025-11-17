
'use client';

import { useUser, initializeFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { GraduationCap, Video, ListVideo, PlusCircle, BookOpenCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Course, type Lesson, type Playlist } from '@/lib/types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { safeToDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function TeacherCourses({ teacherId }: { teacherId: string }) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { firestore } = initializeFirebase();

    useEffect(() => {
        if (teacherId) {
            const fetchCourses = async () => {
                setIsLoading(true);
                const coursesQuery = query(collection(firestore, 'courses'), where('teacherId', '==', teacherId));
                const coursesSnapshot = await getDocs(coursesQuery);
                const fetchedCourses = coursesSnapshot.docs.map(doc => doc.data() as Course);
                
                fetchedCourses.sort((a, b) => {
                    const dateA = safeToDate(a.createdAt)?.getTime() || 0;
                    const dateB = safeToDate(b.createdAt)?.getTime() || 0;
                    return dateB - dateA;
                });

                setCourses(fetchedCourses);
                setIsLoading(false);
            };
            fetchCourses();
        }
    }, [teacherId, firestore]);

    if (isLoading) {
        return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;
    }

    if (courses.length === 0) {
        return <p className="text-muted-foreground text-center py-6">لم تقم بإنشاء أي دورات بعد.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map(course => (
                <Card key={course.id}>
                    <CardHeader>
                        <CardTitle>{course.title}</CardTitle>
                        <CardDescription className="truncate h-10">{course.description}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button asChild variant="secondary" className="w-full">
                            <Link href={`/home/teacher/courses/${course.id}`}>
                                عرض الدورة
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

function TeacherPlaylists({ teacherId }: { teacherId: string }) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { firestore } = initializeFirebase();

    useEffect(() => {
        if (teacherId) {
            const fetchPlaylists = async () => {
                setIsLoading(true);
                const playlistsQuery = query(collection(firestore, 'playlists'), where('teacherId', '==', teacherId));
                const playlistsSnapshot = await getDocs(playlistsQuery);
                setPlaylists(playlistsSnapshot.docs.map(doc => doc.data() as Playlist));
                setIsLoading(false);
            };
            fetchPlaylists();
        }
    }, [teacherId, firestore]);

    if (isLoading) {
        return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;
    }

    if (playlists.length === 0) {
        return <p className="text-muted-foreground text-center py-6">لم تقم بإنشاء أي قوائم تشغيل بعد.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {playlists.map(playlist => (
                <Card key={playlist.id}>
                    <CardHeader>
                        <CardTitle>{playlist.title}</CardTitle>
                        <CardDescription className="truncate h-10">{playlist.description}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button asChild variant="secondary" className="w-full">
                            <Link href={`/home/teacher/playlists/edit/${playlist.id}`}>
                                تعديل القائمة
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

export default function TeacherDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { firestore } = initializeFirebase();

  const [lessonCount, setLessonCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchTeacherStats = async () => {
        setIsLoadingStats(true);
        const lessonsQuery = query(collection(firestore, 'lessons'), where('teacherId', '==', user.uid));
        const lessonsSnapshot = await getDocs(lessonsQuery);
        const lessons = lessonsSnapshot.docs.map(doc => doc.data() as Lesson);
        setLessonCount(lessons.length);
        setTotalViews(lessons.reduce((acc, l) => acc + (l.views || 0), 0));

        const coursesQuery = query(collection(firestore, 'courses'), where('teacherId', '==', user.uid));
        const coursesSnapshot = await getDocs(coursesQuery);
        setCourseCount(coursesSnapshot.docs.length);
        
        setIsLoadingStats(false);
      };
      fetchTeacherStats();
    } else if (!isUserLoading) {
        setIsLoadingStats(false);
    }
  }, [user, isUserLoading, firestore]);

  if (isUserLoading) {
    return <div className="flex justify-center items-center h-screen"><Skeleton className="h-48 w-full" /></div>;
  }

  if (!user || !user.email?.endsWith('@teacher.app.com')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>غير مصرح به</CardTitle>
          <CardDescription>هذه الصفحة مخصصة للمعلمين فقط. الرجاء تسجيل الدخول بحساب معلم.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={() => router.push('/login')}>الانتقال إلى صفحة تسجيل الدخول</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <GraduationCap className="h-10 w-10 text-primary" />
            <div>
              <CardTitle>أهلاً بك في لوحة تحكم المعلمين</CardTitle>
              <CardDescription>من هنا يمكنك إدارة دوراتك وقوائم التشغيل الخاصة بك.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الدروس</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingStats ? <Skeleton className="h-8 w-10"/> : <div className="text-2xl font-bold">{lessonCount}</div>}
            <p className="text-xs text-muted-foreground">درسًا منشورًا</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الدورات</CardTitle>
            <ListVideo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-10"/> : <div className="text-2xl font-bold">{courseCount}</div>}
            <p className="text-xs text-muted-foreground">دورة تعليمية متاحة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشاهدات</CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingStats ? <Skeleton className="h-8 w-14"/> : <div className="text-2xl font-bold">{totalViews}</div>}
            <p className="text-xs text-muted-foreground">مشاهدة على كل الدروس</p>
          </CardContent>
        </Card>
      </div>

       <Tabs defaultValue="courses" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="courses">دوراتي</TabsTrigger>
                <TabsTrigger value="playlists">قوائم التشغيل</TabsTrigger>
            </TabsList>
            <TabsContent value="courses" className="mt-6 space-y-4">
                 {isLoadingStats ? (
                     <div className="flex justify-end gap-2">
                         <Skeleton className="h-10 w-32" />
                         <Skeleton className="h-10 w-32" />
                     </div>
                 ) : (
                    <div className="flex justify-end gap-2">
                        <Button asChild>
                            <Link href="/home/teacher/create-lesson">
                                <PlusCircle className="me-2" />
                                إضافة درس جديد
                            </Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/home/teacher/create-course">
                                <PlusCircle className="me-2" />
                                إنشاء دورة جديدة
                            </Link>
                        </Button>
                    </div>
                 )}
                <TeacherCourses teacherId={user.uid} />
            </TabsContent>
            <TabsContent value="playlists" className="mt-6 space-y-4">
                 {isLoadingStats ? (
                    <div className="flex justify-end">
                       <Skeleton className="h-10 w-40" />
                    </div>
                 ) : (
                    <div className="flex justify-end">
                        <Button asChild>
                            <Link href="/home/teacher/playlists/create">
                                <PlusCircle className="me-2" />
                                إنشاء قائمة تشغيل
                            </Link>
                        </Button>
                    </div>
                 )}
                <TeacherPlaylists teacherId={user.uid} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
