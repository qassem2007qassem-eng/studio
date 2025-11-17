
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type Lesson, type User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle, Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { getTeachersByIds } from '@/services/user-service';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

function UserSearchResultCard({ user }: { user: User }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <Link href={`/home/profile/${user.username.toLowerCase()}`} className="flex items-center gap-4 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage alt={user.name} />
            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">@{user.username.toLowerCase()}</p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}


export default function ContentPage() {
    const [allLessons, setAllLessons] = useState<Lesson[]>([]);
    const [allTeachers, setAllTeachers] = useState<Record<string, User>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [teacherResults, setTeacherResults] = useState<User[]>([]);

    const { firestore } = initializeFirebase();

    useEffect(() => {
        const fetchLatestContent = async () => {
            setIsLoading(true);
            const lessonsQuery = query(collection(firestore, 'lessons'), orderBy('createdAt', 'desc'), limit(50));
            try {
                const snapshot = await getDocs(lessonsQuery);
                const fetchedLessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
                setAllLessons(fetchedLessons);

                if (fetchedLessons.length > 0) {
                    const teacherIds = [...new Set(fetchedLessons.map(l => l.teacherId))];
                    const teacherData = await getTeachersByIds(teacherIds);
                    const teacherMap = teacherData.reduce((acc, teacher) => {
                        acc[teacher.id] = teacher;
                        return acc;
                    }, {} as Record<string, User>);
                    setAllTeachers(teacherMap);
                }

            } catch (error) {
                console.error("Error fetching latest lessons: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLatestContent();
    }, [firestore]);
    
    const filteredLessons = useMemo(() => {
        if (!debouncedSearchTerm) {
            return allLessons;
        }
        return allLessons.filter(lesson =>
            lesson.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [allLessons, debouncedSearchTerm]);
    
    useEffect(() => {
        const searchTeachers = async () => {
            if (debouncedSearchTerm && filteredLessons.length === 0) {
                const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                const usersRef = collection(firestore, "users");
                const teachersQuery = query(usersRef, 
                    where('accountType', '==', 'teacher'),
                    where('name', '>=', lowercasedTerm),
                    where('name', '<=', lowercasedTerm + '\uf8ff'),
                    limit(5)
                );
                 try {
                    const teachersSnap = await getDocs(teachersQuery);
                    const fetchedTeachers = teachersSnap.docs.map(doc => doc.data() as User);
                    setTeacherResults(fetchedTeachers);
                 } catch (e) {
                     console.error("Error searching teachers", e);
                     setTeacherResults([]);
                 }
            } else {
                setTeacherResults([]);
            }
        }
        searchTeachers();
    }, [debouncedSearchTerm, filteredLessons, firestore])


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>استكشف المحتوى التعليمي</CardTitle>
                    <CardDescription>ابحث عن دروس أو معلمين أو دورات جديدة.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="ابحث في الدروس أو عن المعلمين..."
                            className="w-full pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <LessonSkeleton key={i} />)}
                </div>
            ) : filteredLessons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredLessons.map(lesson => {
                        const teacher = allTeachers[lesson.teacherId];
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
                                            <AvatarImage src={(teacher as any).profilePictureUrl || undefined} alt={teacher.name} />
                                            <AvatarFallback>{teacher.name?.charAt(0)}</AvatarFallback>
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
            ) : teacherResults.length > 0 ? (
                 <div className="space-y-4">
                     <h3 className="text-lg font-semibold">هل تقصد أحد هؤلاء المعلمين؟</h3>
                     {teacherResults.map(teacher => <UserSearchResultCard key={teacher.id} user={teacher}/>)}
                 </div>
            ) : (
                 <Card>
                    <CardContent className="text-center py-12 text-muted-foreground">
                        <PlayCircle className="h-16 w-16 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">لا توجد نتائج مطابقة</h3>
                        <p>جرّب كلمات بحث مختلفة.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
