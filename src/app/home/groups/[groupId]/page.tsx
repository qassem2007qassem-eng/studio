'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, orderBy, writeBatch } from 'firebase/firestore';
import { useUser, initializeFirebase } from '@/firebase';
import { type Group, type Post, type User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Lock, UserPlus, LogOut, Check, X, ShieldCheck, Users, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePostTrigger } from '@/components/create-post-trigger';
import { PostCard } from '@/components/post-card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { approvePost, rejectPost } from '@/services/post-service';
import { getUsersByIds } from '@/services/user-service';
import Link from 'next/link';
import { ShareGroupDialog } from '@/components/share-group-dialog';
import { safeToDate } from '@/lib/utils';

function GroupPosts({ groupId, status }: { groupId: string, status: 'approved' | 'pending' }) {
    const [allPosts, setAllPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { firestore } = initializeFirebase();

    useEffect(() => {
        const postsRef = collection(firestore, 'posts');
        // A very simple query to avoid any composite indexes.
        // We will filter and sort on the client.
        const q = query(postsRef, where('groupId', '==', groupId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setAllPosts(fetchedPosts);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching group posts:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [groupId, firestore]);
    
    const posts = useMemo(() => {
        return allPosts
            .filter(post => post.status === status)
            .sort((a, b) => {
                const dateA = safeToDate(a.createdAt)?.getTime() || 0;
                const dateB = safeToDate(b.createdAt)?.getTime() || 0;
                return dateB - dateA;
            });
    }, [allPosts, status]);


    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
    }

    if (posts.length === 0) {
        return (
            <Card>
                <CardContent className="text-muted-foreground text-center py-8">
                    {status === 'approved' ? 'لا توجد منشورات في هذه المجموعة حتى الآن.' : 'لا توجد منشورات معلقة للمراجعة.'}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map(post => {
                 if (status === 'pending') {
                    return <PendingPostCard key={post.id} post={post} />;
                }
                return <PostCard key={post.id} post={post} />;
            })}
        </div>
    );
}

function GroupMembers({ memberIds, creatorId }: { memberIds: string[], creatorId: string }) {
    const [members, setMembers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            setIsLoading(true);
            const users = await getUsersByIds(memberIds);
            // Ensure creator is always first in the list
            users.sort((a, b) => {
                if (a.id === creatorId) return -1;
                if (b.id === creatorId) return 1;
                return 0;
            });
            setMembers(users);
            setIsLoading(false);
        };
        fetchMembers();
    }, [memberIds, creatorId]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-[100px]" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
         <div className="space-y-4">
            {members.map(member => (
                <div key={member.id} className="flex items-center justify-between">
                    <Link href={`/home/profile/${member.username.toLowerCase()}`} className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={(member as any).profilePictureUrl} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{member.name}</p>
                            <p className="text-sm text-muted-foreground">@{member.username.toLowerCase()}</p>
                        </div>
                    </Link>
                    {member.id === creatorId && <span className="text-xs font-semibold text-primary px-2 py-1 bg-primary/10 rounded-full">المدير</span>}
                </div>
            ))}
        </div>
    );
}


function PendingPostCard({ post }: { post: Post }) {
    const [isActionLoading, setIsActionLoading] = useState(false);
    const { toast } = useToast();

    const handleApprove = async () => {
        setIsActionLoading(true);
        try {
            await approvePost(post.id);
            toast({ title: "تم قبول المنشور" });
        } catch (e) {
            toast({ title: "خطأ", description: "فشل قبول المنشور", variant: 'destructive'});
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReject = async () => {
        setIsActionLoading(true);
         try {
            await rejectPost(post.id);
            toast({ title: "تم رفض المنشور" });
        } catch (e) {
            toast({ title: "خطأ", description: "فشل رفض المنشور", variant: 'destructive'});
        } finally {
            setIsActionLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">{post.author.name}</p>
                </div>
            </CardHeader>
            <CardContent>
                <p>{post.content}</p>
            </CardContent>
            <CardFooter className="gap-2">
                <Button size="sm" onClick={handleApprove} disabled={isActionLoading}>
                    {isActionLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><Check className="me-2"/> قبول</>}
                </Button>
                 <Button size="sm" variant="destructive" onClick={handleReject} disabled={isActionLoading}>
                    {isActionLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><X className="me-2"/> رفض</>}
                </Button>
            </CardFooter>
        </Card>
    )
}


export default function GroupDetailPage() {
    const params = useParams();
    const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
    const { user } = useUser();
    const { firestore } = initializeFirebase();
    const { toast } = useToast();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingModeration, setIsUpdatingModeration] = useState(false);


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
    const isCreator = user && group?.creatorId === user.uid;
    const canViewContent = group?.privacy === 'public' || isMember;

    const handleJoinLeaveGroup = async () => {
        if (!user || !group) return;

        const groupRef = doc(firestore, 'groups', group.id);
        const action = isMember ? 'leave' : 'join';

        try {
            if (action === 'join') {
                if (group.privacy === 'private') {
                    toast({ title: 'هذه مجموعة خاصة', description: 'لا يمكنك الانضمام مباشرة.', variant: 'default'});
                    return;
                }
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
    
    const handleModerationChange = async (checked: boolean) => {
        if (!isCreator || !group) return;

        setIsUpdatingModeration(true);
        const groupRef = doc(firestore, 'groups', group.id);
        try {
            await updateDoc(groupRef, { moderationRequired: checked });
            toast({ title: 'تم تحديث إعدادات المراجعة بنجاح.' });
        } catch (error: any) {
            toast({ title: 'خطأ', description: 'فشل تحديث الإعدادات.', variant: 'destructive'});
        } finally {
            setIsUpdatingModeration(false);
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
    
    const adminTabs = isCreator ? ['members', 'pending'] : [];
    const defaultTab = "posts";
    const tabCount = 1 + adminTabs.length;

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
                        <div className="flex items-center gap-2">
                            <ShareGroupDialog group={group}>
                                <Button variant="outline">
                                    <Share2 className="me-2"/>
                                    مشاركة
                                </Button>
                            </ShareGroupDialog>
                            <Button 
                                onClick={handleJoinLeaveGroup}
                                disabled={!user}
                                variant={isMember ? 'outline' : 'default'}
                            >
                                {isMember ? <LogOut className="me-2"/> : <UserPlus className="me-2"/>}
                                {isMember ? 'مغادرة المجموعة' : 'الانضمام إلى المجموعة'}
                            </Button>
                        </div>
                    </div>
                     <p className="mt-4 text-muted-foreground">{group.description}</p>
                </CardContent>
            </Card>

            {isCreator && (
                <Card>
                    <CardHeader>
                        <CardTitle>إعدادات الإدارة</CardTitle>
                        <CardDescription>تحكم في إعدادات مجموعتك من هنا.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="moderation-switch" className="text-base flex items-center gap-2">
                                    <ShieldCheck /> مراجعة المنشورات
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    عند التفعيل، يجب عليك قبول منشورات الأعضاء قبل عرضها للجميع.
                                </p>
                            </div>
                            <Switch
                                id="moderation-switch"
                                checked={group.moderationRequired || false}
                                onCheckedChange={handleModerationChange}
                                disabled={isUpdatingModeration}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {canViewContent ? (
                 <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className={`grid w-full grid-cols-${tabCount}`}>
                        <TabsTrigger value="posts">المنشورات</TabsTrigger>
                        {isCreator && <TabsTrigger value="members">الأعضاء</TabsTrigger>}
                        {isCreator && <TabsTrigger value="pending">المنشورات المعلقة</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="posts" className="space-y-6 mt-6">
                         {isMember && <CreatePostTrigger groupId={group.id} />}
                         <GroupPosts groupId={group.id} status="approved" />
                    </TabsContent>
                    
                    {isCreator && (
                        <TabsContent value="members" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Users/> أعضاء المجموعة ({group.memberIds.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <GroupMembers memberIds={group.memberIds} creatorId={group.creatorId} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}

                    {isCreator && (
                        <TabsContent value="pending" className="space-y-6 mt-6">
                            <GroupPosts groupId={group.id} status="pending" />
                        </TabsContent>
                    )}
                </Tabs>
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
