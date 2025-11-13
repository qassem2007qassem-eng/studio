
'use client'

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Settings, UserPlus, UserCheck, Loader2, Lock } from "lucide-react";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { useUser } from "@/firebase";
import { useEffect, useState, useMemo, useCallback } from "react";
import { type User, type Post } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from 'next/navigation';
import { getUserByUsername, followUser, unfollowUser, checkIfFollowing, getCurrentUserProfile } from "@/services/user-service";
import { getPostsForUser } from "@/services/post-service";
import { useToast } from "@/hooks/use-toast";

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

  const usernameFromUrl = useMemo(() => {
    const username = Array.isArray(params.username) ? params.username[0] : params.username;
    return username ? decodeURIComponent(username).toLowerCase() : null;
  }, [params.username]);

  const isCurrentUserProfile = useMemo(() => {
      if(!currentUser || !profileUser) return false;
      return currentUser.uid === profileUser.id;
  }, [currentUser, profileUser]);

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
    const followingStatus = await checkIfFollowing(profileUser.id);
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
    if (isProfileUserLoading) return false; // Wait for profile to load
    if (isCurrentUserProfile) return true;
    if (!profileUser?.isPrivate) return true;
    // For private profiles, wait until follow status is confirmed
    if (isFollowStatusLoading) return false; 
    return isFollowing;
  }, [isProfileUserLoading, isFollowStatusLoading, isCurrentUserProfile, isFollowing, profileUser]);


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

    // Only fetch posts once we know if we can view them
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
       // Re-fetch profile user to get updated follower count
       const updatedUser = await getUserByUsername(usernameFromUrl);
       setProfileUser(updatedUser);
       
       // This ensures the current user's profile is also up-to-date for subsequent actions
       await getCurrentUserProfile({ forceRefresh: true }); 
    } catch (e) {
      console.error("Error toggling follow:", e);
      toast({ title: "حدث خطأ", description: "لم نتمكن من إتمام العملية. حاول مرة أخرى.", variant: "destructive" });
      setIsFollowing(prev => !prev);
    } finally {
      setIsTogglingFollow(false);
    }
  };

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
          <div className="flex justify-between">
            <Avatar className="-mt-16 h-28 w-28 border-4 border-card">
              <AvatarImage src={profileUser.avatarUrl || undefined} alt={profileUser.name} />
              <AvatarFallback>{profileUser.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            {isCurrentUserProfile ? (
                 <Button variant="outline" onClick={() => router.push('/home/settings')}>
                    <Settings className="h-4 w-4 me-2" />
                    تعديل الملف الشخصي
                </Button>
            ): (
                <Button onClick={handleFollowToggle} disabled={followButtonDisabled} variant={isFollowing ? 'secondary' : 'default'}>
                    {isTogglingFollow ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                     isFollowing ? <><UserCheck className="h-4 w-4 me-2" /> متابَع</> : <><UserPlus className="h-4 w-4 me-2" /> متابعة</>}
                </Button> 
            )}
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
            <div>
              <span className="font-bold text-foreground">{followingCount}</span> متابِع
            </div>
            <div>
              <span className="font-bold text-foreground">{followerCount}</span> متابَع
            </div>
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
    </div>
  );
}

    