'use client';

import { useUser, initializeFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CatLoader } from '@/components/cat-loader';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { GraduationCap, Video, ListVideo, PlusCircle, BookOpenCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Course, type Lesson } from '@/lib/types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import Link from 'next/link';

export default function TeacherDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { firestore } = initializeFirebase();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchTeacherData = async () => {
        setIsLoadingStats(true);
        // Fetch courses
        const coursesQuery = query(collection(firestore, 'courses'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'));
        const coursesSnapshot = await getDocs(coursesQuery);
        const fetchedCourses = coursesSnapshot.docs.map(doc => doc.data() as Course);
        setCourses(fetchedCourses);

        // Fetch lessons
        const lessonsQuery = query(collection(firestore, 'lessons'), where('teacherId', '==', user.uid));
        const lessonsSnapshot = await getDocs(lessonsQuery);
        setLessons(lessonsSnapshot.docs.map(doc => doc.data() as Lesson));

        setIsLoadingStats(false);
      };
      fetchTeacherData();
    }
  }, [user, firestore]);

  if (isUserLoading) {
    return <div className="flex justify-center items-center h-screen"><CatLoader /></div>;
  }

  // A simple check to see if the user is likely a teacher
  if (!user || !user.email?.endsWith('@teacher.app.com')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>غير مصرح به</CardTitle>
          <CardDescription>هذه الصفحة مخصصة للمعلمين فقط. الرجاء تسجيل الدخول بحساب معلم.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={() => router.push('/teacher-login')}>الانتقال إلى صفحة تسجيل دخول المعلمين</Button>
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
              <CardDescription>من هنا يمكنك إدارة دوراتك ودروسك التعليمية.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex gap-2">
            <Button onClick={() => router.push('/home/teacher/create-lesson')}>
                <PlusCircle className="me-2" />
                إضافة درس جديد
            </Button>
             <Button onClick={() => router.push('/home/teacher/create-course')} variant="secondary">
                <PlusCircle className="me-2" />
                إنشاء دورة جديدة
            </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الدروس</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingStats ? <Skeleton className="h-8 w-10"/> : <div className="text-2xl font-bold">{lessons.length}</div>}
            <p className="text-xs text-muted-foreground">درسًا منشورًا</p>
          </CardContent>
        </Card>
        <Card className="hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الدورات</CardTitle>
            <ListVideo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-10"/> : <div className="text-2xl font-bold">{courses.length}</div>}
            <p className="text-xs text-muted-foreground">دورة تعليمية متاحة</p>
          </CardContent>
        </Card>
        <Card className="hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشاهدات</CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingStats ? <Skeleton className="h-8 w-14"/> : <div className="text-2xl font-bold">{lessons.reduce((acc, l) => acc + (l.views || 0), 0)}</div>}
            <p className="text-xs text-muted-foreground">مشاهدة على كل الدروس</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>أحدث الدورات</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoadingStats ? (
                <CatLoader />
            ) : courses.length > 0 ? (
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
            ) : (
                <p className="text-muted-foreground">لم تقم بإنشاء أي دورات بعد. ابدأ بإنشاء دورتك الأولى!</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
