
'use client'

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Settings, UserPlus, UserCheck, Lock, Trash2, UserPlus2, Flag, Verified, ListVideo } from "lucide-react";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { useUser } from "@/firebase";
import { useEffect, useState, useMemo, useCallback } from "react";
import { type User, type Post, type Playlist, type Course } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from 'next/navigation';
import { getUserByUsername, followUser, unfollowUser, getCurrentUserProfile, deleteUserAndContent } from "@/services/user-service";
import { getPostsForUser } from "@/services/post-service";
import { getPlaylistsByTeacher } from "@/services/playlist-service";
import { useToast } from "@/hooks/use-toast";
import { FollowListDialog } from "@/components/follow-list-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { ReportDialog } from "@/components/report-dialog";
import { cn } from "@/lib/utils";
import { createReport } from "@/services/report-service";
import { getCoursesByIds } from "@/services/course-service";


// Simple admin check
const isAdminUser = (user: User | null) => {
    if (!user) return false;
    return user.email === 'admin@app.com';
};

function TeacherPlaylists({ teacherId }: { teacherId: string }) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [courses, setCourses] = useState<Record<string, Course>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPlaylists = async () => {
            setIsLoading(true);
            const fetchedPlaylists = await getPlaylistsByTeacher(teacherId);
            setPlaylists(fetchedPlaylists);

            if (fetchedPlaylists.length > 0) {
                const allCourseIds = fetchedPlaylists.flatMap(p => p.courseIds);
                const uniqueCourseIds = [...new Set(allCourseIds)];
                const fetchedCourses = await getCoursesByIds(uniqueCourseIds);
                const coursesMap = fetchedCourses.reduce((acc, course) => {
                    acc[course.id] = course;
                    return acc;
                }, {} as Record<string, Course>);
                setCourses(coursesMap);
            }
            setIsLoading(false);
        };
        fetchPlaylists();
    }, [teacherId]);

    if (isLoading) {
        return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
    }

    if (playlists.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    لم يقم هذا المعلم بإنشاء أي قوائم تشغيل بعد.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {playlists.map(playlist => (
                <Card key={playlist.id}>
                    <CardHeader>
                        <CardTitle>{playlist.title}</CardTitle>
                        <CardDescription>{playlist.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {playlist.courseIds.map(courseId => {
                            const course = courses[courseId];
                            if (!course) return <Skeleton key={courseId} className="h-12 w-full" />;
                            return (
                                <Link key={courseId} href={`/lessons/${course.lessonIds?.[0]}`} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50">
                                     <Avatar className="h-12 w-20 rounded-md" variant="square">
                                        <AvatarImage src={course.thumbnailUrl} alt={course.title} className="object-cover"/>
                                        <AvatarFallback className="rounded-md bg-secondary flex items-center justify-center">
                                            <ListVideo className="text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{course.title}</p>
                                        <p className="text-sm text-muted-foreground">{course.lessonIds.length} دروس</p>
                                    </div>
                                </Link>
                            )
                        })}
                         {playlist.courseIds.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">قائمة التشغيل هذه فارغة.</p>}
                    </CardContent>
                </Card>
            ))}
        </div>
    )

}


export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  const { firestore } = useFirebase();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isProfileUserLoading, setIsProfileUserLoading] = useState(true);
  
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [isFollowing, setIsFollowing] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(true);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);


  const usernameFromUrl = useMemo(() => {
    const username = Array.isArray(params.username) ? params.username[0] : params.username;
    return username ? decodeURIComponent(username).toLowerCase() : null;
  }, [params.username]);

  const isCurrentUserProfile = useMemo(() => {
      if(!currentUser || !profileUser) return false;
      return currentUser.uid === profileUser.id;
  }, [currentUser, profileUser]);

  const isAdmin = isAdminUser(currentUser as User | null);
  const isTeacher = profileUser?.email?.endsWith('@teacher.app.com');

  const fetchProfileUser = useCallback(async () => {
    if (!usernameFromUrl) return;
    setIsProfileUserLoading(true);
    const user = await getUserByUsername(usernameFromUrl);
    setProfileUser(user);
    setIsProfileUserLoading(false);
  }, [usernameFromUrl]);

  const checkFollowStatus = useCallback(async () => {
    if (!currentUser || !profileUser || isCurrentUserProfile) {
      setIsFollowStatusLoading(false);
      return;
    }
    setIsFollowStatusLoading(true);
    const userProfile = await getCurrentUserProfile({ forceRefresh: true });
    
    setIsFollowing(userProfile?.following?.includes(profileUser.id) || false);
    
    if (profileUser.isPrivate && !(userProfile?.following?.includes(profileUser.id))) {
        const q = query(
            collection(firestore, `users/${profileUser.id}/notifications`),
            where('type', '==', 'follow_request'),
            where('fromUser.id', '==', currentUser.uid)
        );
        const requestSnap = await getDocs(q);
        setHasPendingRequest(!requestSnap.empty);
    } else {
        setHasPendingRequest(false);
    }

    setIsFollowStatusLoading(false);
  }, [currentUser, profileUser, isCurrentUserProfile, firestore]);

  useEffect(() => {
    fetchProfileUser();
  }, [fetchProfileUser]);

  useEffect(() => {
    if (profileUser && !isCurrentUserLoading) {
      checkFollowStatus();
    }
  }, [profileUser, isCurrentUserLoading, checkFollowStatus]);

  const canViewContent = useMemo(() => {
    if (isProfileUserLoading) return false; // Don't show content if profile is loading
    if (isAdmin || isCurrentUserProfile) return true;
    if (!profileUser?.isPrivate) return true;
    if (isFollowStatusLoading) return false; // Don't show content if follow status is loading
    return isFollowing;
  }, [isProfileUserLoading, isFollowStatusLoading, isCurrentUserProfile, isFollowing, profileUser, isAdmin]);


  useEffect(() => {
    const fetchPosts = async () => {
      if (!profileUser) {
        setUserPosts([]);
        setPostsLoading(false);
        return;
      }
      setPostsLoading(true);
      const posts = await getPostsForUser(profileUser.id, currentUser?.uid);
      setUserPosts(posts);
      setPostsLoading(false);
    };

    if (!isProfileUserLoading) {
      fetchPosts();
    }
  }, [profileUser, currentUser?.uid, isProfileUserLoading]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser || isTogglingFollow || isCurrentUserProfile) return;

    setIsTogglingFollow(true);
    
    try {
      if (isFollowing) {
        await unfollowUser(profileUser.id);
        setIsFollowing(false);
        toast({ title: `تم إلغاء متابعة ${profileUser.name}`});
      } else {
        await followUser(profileUser.id);
        if (profileUser.isPrivate) {
            setHasPendingRequest(true);
            toast({ title: "تم إرسال طلب المتابعة"});
        } else {
            setIsFollowing(true);
            toast({ title: `أنت تتابع الآن ${profileUser.name}`});
        }
      }
       const updatedUser = await getUserByUsername(usernameFromUrl);
       setProfileUser(updatedUser);
       await getCurrentUserProfile({ forceRefresh: true }); 
    } catch (e) {
      console.error("Error toggling follow:", e);
      toast({ title: "حدث خطأ", description: "لم نتمكن من إتمام العملية. حاول مرة أخرى.", variant: "destructive" });
      // Don't revert state here as the actual state might be complex (e.g. request sent)
      await checkFollowStatus();
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const onFollowStateChange = async () => {
      const updatedUser = await getUserByUsername(usernameFromUrl);
      setProfileUser(updatedUser);
      await getCurrentUserProfile({ forceRefresh: true });
  }
  
  const handleDeleteUser = async () => {
    if (!isAdmin || !profileUser) return;
    setIsDeletingUser(true);
    try {
        await deleteUserAndContent(profileUser.id);
        toast({ title: "تم حذف المستخدم بنجاح", description: `تم حذف حساب ${profileUser.name} وكل محتوياته.` });
        router.push('/home');
    } catch(error: any) {
        console.error("Error deleting user:", error);
        toast({ title: "خطأ", description: error.message || "فشل حذف المستخدم.", variant: "destructive" });
        setIsDeletingUser(false);
        setIsDeleteAlertOpen(false);
    }
  }

  const handleReportUser = async (reason: string) => {
    if (!currentUser || !profileUser) return;
     if (!reason) {
        toast({ title: "خطأ", description: "الرجاء إدخال سبب للإبلاغ.", variant: "destructive"});
        return;
    }
    try {
      await createReport({
        reportedEntityId: profileUser.id,
        reportedEntityType: 'user',
        reason: reason,
      });
      toast({ title: "تم إرسال الإبلاغ بنجاح" });
      setIsReportDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };
  
  const getFollowButton = () => {
      if (isFollowStatusLoading) return <Button disabled><span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /></Button>;
      if (isFollowing) return <Button onClick={handleFollowToggle} variant='secondary' disabled={isTogglingFollow}>{isTogglingFollow ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><UserCheck className="h-4 w-4 me-2" /> متابَع</>}</Button>;
      if (hasPendingRequest) return <Button disabled variant='secondary'><UserPlus2 className="h-4 w-4 me-2"/> معلق</Button>;
      if (profileUser?.isPrivate) return <Button onClick={handleFollowToggle} disabled={isTogglingFollow}>{isTogglingFollow ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><UserPlus className="h-4 w-4 me-2"/> طلب متابعة</>}</Button>
      return <Button onClick={handleFollowToggle} disabled={isTogglingFollow}>{isTogglingFollow ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><UserPlus className="h-4 w-4 me-2" /> متابعة</>}</Button>
  }

  if (isProfileUserLoading || isCurrentUserLoading) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-4 relative">
                <Skeleton className="-mt-16 h-28 w-28 rounded-full border-4 border-card" />
                 <div className="mt-4 space-y-2">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                 </div>
            </CardContent>
        </Card>
      </div>
    )
  }

  if (!profileUser) {
      return (
          <Card>
              <CardContent className="p-8 text-center">
                  <h2 className="text-2xl font-bold">المستخدم غير موجود</h2>
                  <p className="text-muted-foreground">عذراً، لم نتمكن من العثور على المستخدم الذي تبحث عنه.</p>
                  <Button asChild className="mt-4">
                      <Link href="/home">العودة للصفحة الرئيسية</Link>
                  </Button>
              </CardContent>
          </Card>
      )
  }
  
  const followerCount = profileUser.followers?.length || 0;
  const followingCount = profileUser.following?.length || 0;
  const tabs = isTeacher ? ["playlists", "posts"] : ["posts"];
  const defaultTab = isTeacher ? "playlists" : "posts";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative h-48 w-full bg-muted">
        </div>
        <CardContent className="p-4 relative">
          <div className="flex justify-between items-start">
            <Avatar className="-mt-16 h-28 w-28 border-4 border-card">
              <AvatarImage alt={profileUser.name} />
              <AvatarFallback>{profileUser.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
                {isCurrentUserProfile ? (
                     <Button variant="outline" onClick={() => router.push('/home/settings')}>
                        <Settings className="h-4 w-4 me-2" />
                        تعديل الملف الشخصي
                    </Button>
                ): isAdmin ? (
                     <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)}>
                        <Trash2 className="h-4 w-4 me-2"/>
                        حذف المستخدم (مشرف)
                    </Button>
                ) : (
                  <>
                    {getFollowButton()}
                    <Button variant="outline" size="icon" onClick={() => setIsReportDialogOpen(true)}>
                      <Flag className="h-4 w-4" />
                    </Button>
                  </>
                )}
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-headline">{profileUser.name}</h1>
                {profileUser.isVerified && <Verified className="h-6 w-6 text-blue-500" />}
            </div>
            <p className="text-sm text-muted-foreground">@{profileUser.username.toLowerCase()}</p>
            {canViewContent ? (
                 <p className="pt-2">{profileUser.bio || "لا يوجد نبذة تعريفية."}</p>
            ) : (
                <p className="pt-2 text-muted-foreground italic">تابع هذا المستخدم لعرض نبذته التعريفية.</p>
            )}
          </div>
          <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
            <FollowListDialog 
                title="يتابع" 
                userIds={profileUser.following || []} 
                trigger={
                    <button className="hover:underline disabled:cursor-default disabled:no-underline" disabled={followingCount === 0 || !canViewContent}>
                        <span className="font-bold text-foreground">{followingCount}</span> متابِع
                    </button>
                }
                onFollowStateChange={onFollowStateChange}
            />
            <FollowListDialog 
                title="المتابعون" 
                userIds={profileUser.followers || []} 
                trigger={
                    <button className="hover:underline disabled:cursor-default disabled:no-underline" disabled={followerCount === 0 || !canViewContent}>
                        <span className="font-bold text-foreground">{followerCount}</span> متابَع
                    </button>
                }
                onFollowStateChange={onFollowStateChange}
            />
             <div>
              <span className="font-bold text-foreground">{canViewContent ? (userPosts?.length || 0) : '؟'}</span> منشور
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isCurrentUserProfile && !isTeacher && <CreatePostTrigger />}

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className={cn("grid w-full", tabs.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {isTeacher && <TabsTrigger value="playlists">قوائم التشغيل</TabsTrigger>}
          <TabsTrigger value="posts">المنشورات</TabsTrigger>
        </TabsList>

        {isTeacher && (
             <TabsContent value="playlists" className="space-y-6 mt-6">
                {canViewContent ? (
                    <TeacherPlaylists teacherId={profileUser.id} />
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground space-y-2">
                            <Lock className="h-8 w-8 mx-auto"/>
                            <h3 className="font-semibold text-lg text-foreground">هذا الحساب خاص</h3>
                            <p>تابع هذا الحساب لرؤية قوائم التشغيل الخاصة به.</p>
                        </CardContent>
                    </Card>
                )}
             </TabsContent>
        )}

        <TabsContent value="posts" className="space-y-6 mt-6">
           {!canViewContent ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground space-y-2">
                        <Lock className="h-8 w-8 mx-auto"/>
                        <h3 className="font-semibold text-lg text-foreground">هذا الحساب خاص</h3>
                        <p>تابع هذا الحساب لرؤية منشوراته.</p>
                    </CardContent>
                </Card>
           ) : postsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
           ) : userPosts.length > 0 ? (
            userPosts.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    لم ينشر {profileUser.name} أي شيء بعد.
                </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد من حذف هذا المستخدم؟</AlertDialogTitle>
                    <AlertDialogDescription>
                        هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف حساب المستخدم وجميع منشوراته وتعليقاته بشكل دائم.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90" disabled={isDeletingUser}>
                        {isDeletingUser ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : "نعم، قم بالحذف"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <ReportDialog
            open={isReportDialogOpen}
            onOpenChange={setIsReportDialogOpen}
            onReportSubmit={handleReportUser}
            title={`الإبلاغ عن @${profileUser.username}`}
            description="لماذا تبلغ عن هذا الحساب؟ سيتم إرسال بلاغك إلى المشرفين للمراجعة."
        />

    </div>
  );
}
