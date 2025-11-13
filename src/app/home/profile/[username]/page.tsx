
'use client'

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Settings, UserPlus, UserCheck, Loader2, Lock, Trash2 } from "lucide-react";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { useUser } from "@/firebase";
import { useEffect, useState, useMemo, useCallback } from "react";
import { type User, type Post } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from 'next/navigation';
import { getUserByUsername, followUser, unfollowUser, checkIfFollowing, getCurrentUserProfile, deleteUserAndContent } from "@/services/user-service";
import { getPostsForUser } from "@/services/post-service";
import { useToast } from "@/hooks/use-toast";
import { FollowListDialog } from "@/components/follow-list-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Simple admin check
const isAdminUser = (user: User | null) => {
    if (!user) return false;
    return user.email === 'admin@app.com';
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isProfileUserLoading, setIsProfileUserLoading] = useState(true);
  
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(true);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);


  const usernameFromUrl = useMemo(() => {
    const username = Array.isArray(params.username) ? params.username[0] : params.username;
    return username ? decodeURIComponent(username).toLowerCase() : null;
  }, [params.username]);

  const isCurrentUserProfile = useMemo(() => {
      if(!currentUser || !profileUser) return false;
      return currentUser.uid === profileUser.id;
  }, [currentUser, profileUser]);

  const isAdmin = isAdminUser(currentUser);

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
    const followingStatus = await checkIfFollowing(profileUser.id, { forceRefresh: true });
    setIsFollowing(followingStatus);
    setIsFollowStatusLoading(false);
  }, [currentUser, profileUser, isCurrentUserProfile]);

  useEffect(() => {
    fetchProfileUser();
  }, [fetchProfileUser]);

  useEffect(() => {
    if (profileUser && !isCurrentUserLoading) {
      checkFollowStatus();
    }
  }, [profileUser, isCurrentUserLoading, checkFollowStatus]);

  const canViewContent = useMemo(() => {
    if (isProfileUserLoading) return false;
    if (isAdmin || isCurrentUserProfile) return true;
    if (!profileUser?.isPrivate) return true;
    if (isFollowStatusLoading) return false; 
    return isFollowing;
  }, [isProfileUserLoading, isFollowStatusLoading, isCurrentUserProfile, isFollowing, profileUser, isAdmin]);


  useEffect(() => {
    const fetchPosts = async () => {
      if (!profileUser || !canViewContent) {
        setUserPosts([]);
        setPostsLoading(false);
        return;
      }
      setPostsLoading(true);
      const posts = await getPostsForUser(profileUser.id, currentUser?.uid);
      setUserPosts(posts);
      setPostsLoading(false);
    };

    if (!isProfileUserLoading && !isFollowStatusLoading) {
      fetchPosts();
    }
  }, [profileUser, canViewContent, currentUser?.uid, isProfileUserLoading, isFollowStatusLoading]);

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
        setIsFollowing(true);
        toast({ title: `أنت تتابع الآن ${profileUser.name}`});
      }
       const updatedUser = await getUserByUsername(usernameFromUrl);
       setProfileUser(updatedUser);
       await getCurrentUserProfile({ forceRefresh: true }); 
    } catch (e) {
      console.error("Error toggling follow:", e);
      toast({ title: "حدث خطأ", description: "لم نتمكن من إتمام العملية. حاول مرة أخرى.", variant: "destructive" });
      setIsFollowing(prev => !prev);
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

  if (isProfileUserLoading || isCurrentUserLoading) {
    return (
        <div className="space-y-6">
            <Card className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 relative">
                    <Skeleton className="absolute -mt-16 h-28 w-28 rounded-full border-4 border-card"/>
                    <div className="flex justify-end pt-2">
                      <Skeleton className="h-10 w-32" />
                    </div>
                    <div className="mt-4 space-y-4">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-10 w-full" />
                         <div className="flex gap-6">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-20" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-40 w-full" />
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
  const followButtonDisabled = isFollowStatusLoading || isTogglingFollow || isCurrentUserLoading;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative h-48 w-full bg-muted">
            {profileUser.coverUrl && 
                <Image
                    src={profileUser.coverUrl}
                    alt={`${profileUser.name}'s cover photo`}
                    data-ai-hint="user cover photo"
                    fill
                    className="object-cover"
                />
            }
        </div>
        <CardContent className="p-4 relative">
          <div className="flex justify-between items-start">
            <Avatar className="-mt-16 h-28 w-28 border-4 border-card">
              <AvatarImage src={profileUser.avatarUrl || undefined} alt={profileUser.name} />
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
                    <Button onClick={handleFollowToggle} disabled={followButtonDisabled} variant={isFollowing ? 'secondary' : 'default'}>
                        {isTogglingFollow ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                         isFollowing ? <><UserCheck className="h-4 w-4 me-2" /> متابَع</> : <><UserPlus className="h-4 w-4 me-2" /> متابعة</>}
                    </Button> 
                )}
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-bold font-headline">{profileUser.name}</h1>
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
      
      {isCurrentUserProfile && <CreatePostTrigger />}

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">المنشورات</TabsTrigger>
          <TabsTrigger value="replies" disabled>الردود</TabsTrigger>
          <TabsTrigger value="media" disabled>الوسائط</TabsTrigger>
          <TabsTrigger value="likes" disabled>الإعجابات</TabsTrigger>
        </TabsList>
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
            <Skeleton className="h-40 w-full" />
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
                        {isDeletingUser ? <Loader2 className="animate-spin" /> : "نعم، قم بالحذف"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
