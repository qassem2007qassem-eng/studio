
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useUser, initializeFirebase } from '@/firebase';
import { type Group } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Lock, UserPlus, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GroupDetailPage() {
    const params = useParams();
    const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
    const { user } = useUser();
    const { firestore } = initializeFirebase();
    const { toast } = useToast();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!groupId || !firestore) return;
        
        setIsLoading(true);
        const groupRef = doc(firestore, 'groups', groupId);

        const unsubscribe = onSnapshot(groupRef, (doc) => {
            if (doc.exists()) {
                setGroup({ id: doc.id, ...doc.data() } as Group);
            } else {
                setGroup(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching group details:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [groupId, firestore]);

    const isMember = user && group?.memberIds.includes(user.uid);
    const canViewContent = group?.privacy === 'public' || isMember;

    const handleJoinLeaveGroup = async () => {
        if (!user || !group) return;

        const groupRef = doc(firestore, 'groups', group.id);
        const action = isMember ? 'leave' : 'join';

        try {
            if (action === 'join') {
                await updateDoc(groupRef, {
                    memberIds: arrayUnion(user.uid)
                });
                toast({ title: 'لقد انضممت إلى المجموعة!' });
            } else {
                 if (group.creatorId === user.uid) {
                    toast({ title: 'لا يمكنك مغادرة مجموعة قمت بإنشائها.', variant: 'destructive'});
                    return;
                }
                await updateDoc(groupRef, {
                    memberIds: arrayRemove(user.uid)
                });
                toast({ title: 'لقد غادرت المجموعة.' });
            }
        } catch (error: any) {
             toast({ title: 'حدث خطأ', description: error.message, variant: 'destructive'});
        }
    };


    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    if (!group) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <h2 className="text-2xl font-bold">المجموعة غير موجودة</h2>
                    <p className="text-muted-foreground">عذراً، لم نتمكن من العثور على هذه المجموعة.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card className="overflow-hidden">
                <div className="relative h-48 w-full bg-muted">
                    {/* Cover image will go here */}
                </div>
                 <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                         <div className="flex items-end gap-4 -mt-12">
                             <Avatar className="h-24 w-24 border-4 border-card">
                                <AvatarFallback className="text-4xl">{group.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="pb-2">
                                <h1 className="text-2xl font-bold font-headline">{group.name}</h1>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {group.privacy === 'public' ? <Globe /> : <Lock />}
                                    <span>{group.privacy === 'public' ? 'مجموعة عامة' : 'مجموعة خاصة'}</span>
                                    <span>·</span>
                                    <span>{group.memberIds.length} أعضاء</span>
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={handleJoinLeaveGroup}
                            disabled={!user}
                            variant={isMember ? 'outline' : 'default'}
                        >
                            {isMember ? <LogOut className="me-2"/> : <UserPlus className="me-2"/>}
                            {isMember ? 'مغادرة المجموعة' : 'الانضمام إلى المجموعة'}
                        </Button>
                    </div>
                     <p className="mt-4 text-muted-foreground">{group.description}</p>
                </CardContent>
            </Card>
            
            {canViewContent ? (
                 <Card>
                    <CardHeader>
                        <CardTitle>المنشورات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Posts will be listed here */}
                        <p className="text-muted-foreground text-center py-8">لا توجد منشورات حتى الآن.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground space-y-2">
                        <Lock className="h-8 w-8 mx-auto"/>
                        <h3 className="font-semibold text-lg text-foreground">هذه مجموعة خاصة</h3>
                        <p>انضم إلى هذه المجموعة لرؤية منشوراتها والمشاركة فيها.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
