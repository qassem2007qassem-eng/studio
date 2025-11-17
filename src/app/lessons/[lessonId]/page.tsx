
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useUser, initializeFirebase, useMemoFirebase } from '@/firebase';
import { type Lesson, type Course, type Teacher, type LessonComment, type User } from '@/lib/types';
import { getLessonById, getLessonsByCourseId, addCommentToLesson, toggleLikeLesson } from '@/services/lesson-service';
import { getTeacherById } from '@/services/user-service';
import { doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, Eye, Clock, PlayCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { cn, formatDistanceToNow, safeToDate } from '@/lib/utils';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, orderBy, query } from 'firebase/firestore';

function formatDuration(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return '0 د';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    let result = '';
    if (h > 0) result += `${h} س `;
    if (m > 0) result += `${m} د`;
    return result.trim() || '0 د';
}

function getYouTubeVideoId(url: string): string | null {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1);
        }
        if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
        }
        return null;
    } catch (e) {
        return null;
    }
}


function LessonComments({ lessonId }: { lessonId: string }) {
    const { user } = useUser();
    const { firestore } = initializeFirebase();
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const commentsQuery = useMemoFirebase(() => {
        if (!lessonId) return null;
        return query(collection(firestore, `lessons/${lessonId}/comments`), orderBy('createdAt', 'desc'));
    }, [lessonId, firestore]);

    const { data: comments, isLoading } = useCollection<LessonComment>(commentsQuery);

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !commentText.trim()) return;
        setIsSubmitting(true);
        try {
            await addCommentToLesson(lessonId, commentText);
            setCommentText('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>التعليقات ({comments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleSubmitComment} className="flex gap-2">
                    <Input
                        placeholder="أضف تعليقًا..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        disabled={!user || isSubmitting}
                    />
                    <Button type="submit" disabled={!user || !commentText.trim() || isSubmitting}>
                        {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'نشر'}
                    </Button>
                </form>
                <Separator />
                <div className="space-y-4">
                    {isLoading && <p>جاري تحميل التعليقات...</p>}
                    {comments && comments.length > 0 ? (
                        comments.map(comment => (
                             <div key={comment.id} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage alt={comment.author.name} />
                                    <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="bg-muted p-3 rounded-lg">
                                        <Link href={`/home/profile/${comment.author.username?.toLowerCase()}`} className="font-semibold text-sm hover:underline">
                                            {comment.author.name}
                                        </Link>
                                        <p className="text-sm">{comment.content}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{safeToDate(comment.createdAt) ? formatDistanceToNow(safeToDate(comment.createdAt)!) : ''}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        !isLoading && <p className="text-center text-muted-foreground py-6">لا توجد تعليقات بعد. كن أول من يعلق!</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function CoursePlaylist({ courseId, currentLessonId }: { courseId: string, currentLessonId: string }) {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPlaylist = async () => {
            setIsLoading(true);
            const courseData = await getDoc(doc(initializeFirebase().firestore, 'courses', courseId)).then(d => d.data() as Course);
            setCourse(courseData);
            const courseLessons = await getLessonsByCourseId(courseId);
            setLessons(courseLessons);
            setIsLoading(false);
        }
        fetchPlaylist();
    }, [courseId]);

    if (isLoading) {
        return <Skeleton className="h-96 w-full lg:w-96" />;
    }

    if (!course || lessons.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{lessons.length} دروس</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-2">
                        {lessons.map((lesson, index) => (
                            <Link href={`/lessons/${lesson.id}`} key={lesson.id} className={cn(
                                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                                lesson.id === currentLessonId ? "bg-primary/10" : "hover:bg-muted"
                            )}>
                                <span className="text-sm font-medium text-muted-foreground w-6 text-center">{index + 1}</span>
                                 <Avatar className="h-14 w-24 rounded" variant="square">
                                    <AvatarImage src={lesson.thumbnailUrl} alt={lesson.title} className="object-cover"/>
                                    <AvatarFallback className="rounded bg-secondary flex items-center justify-center">
                                        <PlayCircle className="text-muted-foreground h-6 w-6" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm leading-tight">{lesson.title}</p>
                                    <p className="text-xs text-muted-foreground">{formatDuration(lesson.duration)}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export default function LessonPlayerPage() {
    const params = useParams();
    const lessonId = Array.isArray(params.lessonId) ? params.lessonId[0] : params.lessonId;
    const { user } = useUser();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        if (!lessonId) return;

        const fetchLessonData = async () => {
            setIsLoading(true);
            const lessonData = await getLessonById(lessonId as string);
            if (lessonData) {
                setLesson(lessonData);
                const teacherData = await getTeacherById(lessonData.teacherId);
                setTeacher(teacherData);
                if (user) {
                    setIsLiked(lessonData.likes?.includes(user.uid));
                }
            } else {
                notFound();
            }
            setIsLoading(false);
        };
        fetchLessonData();
    }, [lessonId, user]);
    
    const handleLikeToggle = async () => {
        if (!user || !lesson) return;
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked); // Optimistic update
        
        try {
            await toggleLikeLesson(lesson.id, newIsLiked);
            // Refresh lesson data to get updated like count
            const updatedLesson = await getLessonById(lesson.id);
            setLesson(updatedLesson);
        } catch(e) {
            console.error(e);
            setIsLiked(!newIsLiked); // Revert on error
        }
    }

    if (isLoading) {
        return (
             <div className="container mx-auto p-4 lg:grid lg:grid-cols-3 lg:gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="aspect-video w-full" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                </div>
                <div className="hidden lg:block">
                     <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }
    
    if (!lesson) {
        return notFound();
    }
    
    const videoId = getYouTubeVideoId(lesson.videoUrl);

    return (
        <div className="container mx-auto p-4 lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Card className="overflow-hidden">
                    {videoId ? (
                        <div className="aspect-video">
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                title={lesson.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    ) : (
                         <div className="aspect-video bg-black flex items-center justify-center text-white">
                            لا يمكن عرض الفيديو. الرابط غير مدعوم.
                         </div>
                    )}
                </Card>

                <div className="space-y-4">
                    <h1 className="text-2xl font-bold font-headline">{lesson.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{lesson.views} مشاهدات</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                             <span>{lesson.likes?.length || 0} إعجابات</span>
                        </div>
                         <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{safeToDate(lesson.createdAt) ? formatDistanceToNow(safeToDate(lesson.createdAt)!) : ''}</span>
                        </div>
                    </div>
                     {teacher && (
                        <div className="flex items-center justify-between">
                            <Link href={`/home/profile/${teacher.id}`} className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={teacher.profilePictureUrl} alt={teacher.name} />
                                    <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{teacher.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                                        <GraduationCap className="h-4 w-4" />
                                        <span>معلم</span>
                                    </div>
                                </div>
                            </Link>
                             <Button onClick={handleLikeToggle} disabled={!user} variant={isLiked ? 'default' : 'outline'}>
                                <ThumbsUp className="me-2"/> {isLiked ? 'أعجبني' : 'إعجاب'}
                            </Button>
                        </div>
                    )}
                    {lesson.description && (
                        <Card className="bg-muted/50">
                            <CardContent className="p-4">
                                <p className="text-sm whitespace-pre-wrap">{lesson.description}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
                
                 <div className="lg:hidden">
                    <CoursePlaylist courseId={lesson.courseId} currentLessonId={lesson.id} />
                </div>
                
                <LessonComments lessonId={lesson.id} />
            </div>

            <div className="hidden lg:block">
                 <CoursePlaylist courseId={lesson.courseId} currentLessonId={lesson.id} />
            </div>
        </div>
    );
}
