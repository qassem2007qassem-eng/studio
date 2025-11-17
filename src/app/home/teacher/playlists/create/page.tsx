'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, initializeFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { type Playlist } from '@/lib/types';

export default function CreatePlaylistPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = initializeFirebase();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreatePlaylist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'خطأ', description: 'يجب تسجيل الدخول لإنشاء قائمة تشغيل.', variant: 'destructive' });
            return;
        }
        if (!title.trim()) {
            toast({ title: 'خطأ', description: 'عنوان قائمة التشغيل مطلوب.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);

        try {
            const playlistData: Omit<Playlist, 'id'> = {
                title,
                description,
                teacherId: user.uid,
                courseIds: [],
            };

            const playlistsCollection = collection(firestore, 'playlists');
            const docRef = await addDoc(playlistsCollection, playlistData);
            
            await updateDoc(doc(firestore, 'playlists', docRef.id), { id: docRef.id });

            toast({ title: 'نجاح', description: `تم إنشاء قائمة التشغيل "${title}" بنجاح.` });
            router.push(`/home/teacher/playlists/edit/${docRef.id}`);
        } catch (error: any) {
            console.error("Error creating playlist:", error);
            toast({ title: 'خطأ في إنشاء القائمة', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>إنشاء قائمة تشغيل جديدة</CardTitle>
                <CardDescription>قم بتنظيم دوراتك في مجموعات متخصصة.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreatePlaylist} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">عنوان قائمة التشغيل</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثال: أساسيات علوم الحاسوب"
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
                            placeholder="صف محتوى قائمة التشغيل هذه..."
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || !title.trim()}>
                        {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'إنشاء ومتابعة'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
