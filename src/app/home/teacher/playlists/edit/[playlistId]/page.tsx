'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { type Playlist, type Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deletePlaylist } from '@/services/playlist-service';

function PlaylistEditForm() {
    const { playlistId } = useParams();
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = initializeFirebase();

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (user && playlistId) {
            const fetchPlaylistAndCourses = async () => {
                setIsLoading(true);

                // Fetch playlist
                const playlistRef = doc(firestore, 'playlists', playlistId as string);
                const playlistSnap = await getDoc(playlistRef);

                if (playlistSnap.exists() && playlistSnap.data().teacherId === user.uid) {
                    const data = playlistSnap.data() as Playlist;
                    setPlaylist(data);
                    setTitle(data.title);
                    setDescription(data.description || '');
                    setSelectedCourseIds(new Set(data.courseIds));
                } else {
                    toast({ title: 'خطأ', description: 'لم يتم العثور على قائمة التشغيل أو ليس لديك إذن لتحريرها.', variant: 'destructive' });
                    router.push('/home/teacher');
                    return;
                }

                // Fetch all courses by the teacher
                const coursesQuery = query(collection(firestore, 'courses'), where('teacherId', '==', user.uid));
                const coursesSnapshot = await getDocs(coursesQuery);
                setAllCourses(coursesSnapshot.docs.map(d => d.data() as Course));

                setIsLoading(false);
            };
            fetchPlaylistAndCourses();
        }
    }, [user, playlistId, firestore, router, toast]);

    const handleCourseSelection = (courseId: string, isSelected: boolean) => {
        setSelectedCourseIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(courseId);
            } else {
                newSet.delete(courseId);
            }
            return newSet;
        });
    };

    const handleSaveChanges = async () => {
        if (!playlist) return;
        setIsSaving(true);
        try {
            const playlistRef = doc(firestore, 'playlists', playlist.id);
            await updateDoc(playlistRef, {
                title,
                description,
                courseIds: Array.from(selectedCourseIds),
            });
            toast({ title: 'نجاح', description: 'تم حفظ التغييرات بنجاح.' });
            router.push('/home/teacher');
        } catch (error: any) {
            toast({ title: 'خطأ', description: 'فشل حفظ التغييرات.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!playlist) return;
        setIsDeleting(true);
        try {
            await deletePlaylist(playlist.id);
            toast({ title: 'نجاح', description: 'تم حذف قائمة التشغيل بنجاح.' });
            router.push('/home/teacher');
        } catch (error) {
             toast({ title: 'خطأ', description: 'فشل حذف قائمة التشغيل.', variant: 'destructive' });
             setIsDeleting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!playlist) {
        return null;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>تعديل قائمة التشغيل</CardTitle>
                    <CardDescription>قم بتحديث تفاصيل قائمة التشغيل والدورات المدرجة فيها.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">عنوان قائمة التشغيل</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSaving} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">الوصف</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSaving} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>الدورات</CardTitle>
                    <CardDescription>اختر الدورات التي تريد إضافتها إلى قائمة التشغيل هذه.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {allCourses.length > 0 ? allCourses.map(course => (
                            <div key={course.id} className="flex items-center space-x-2 space-x-reverse p-3 rounded-md border">
                                <Checkbox
                                    id={`course-${course.id}`}
                                    checked={selectedCourseIds.has(course.id)}
                                    onCheckedChange={(checked) => handleCourseSelection(course.id, !!checked)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor={`course-${course.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {course.title}
                                    </label>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        {course.description}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-4">لم تقم بإنشاء أي دورات بعد.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
            
            <div className="flex justify-between items-center">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" disabled={isDeleting}>
                            <Trash2 className="me-2" />
                            حذف القائمة
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                هذا الإجراء سيحذف قائمة التشغيل بشكل نهائي. لن يتم حذف الدورات الموجودة بداخلها.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting ? "جاري الحذف..." : "نعم، قم بالحذف"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'حفظ التغييرات'}
                </Button>
            </div>
        </div>
    );
}

export default function EditPlaylistPage() {
    return <PlaylistEditForm />;
}
