
'use client'

import Image from "next/image";
import Link from "next/link";
import { 
  onSnapshot, 
  collection, 
  query, 
  where, 
  limit, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  increment, 
  getDoc,
  orderBy
} from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Settings, UserPlus, UserCheck, Loader2, Lock } from "lucide-react";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { useUser, useCollection, useMemoFirebase, useFirebase } from "@/firebase";
import { useEffect, useState, useMemo } from "react";
import { type User, type Post } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from 'next/navigation';

export default function ProfilePage() {
  const params = useParams();
  const { firestore } = useFirebase();
  const { user: currentUser } = useUser();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isProfileUserLoading, setIsProfileUserLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(true);

  const usernameFromUrl = useMemo(() => {
    const username = Array.isArray(params.username) ? params.username[0] : params.username;
    return username ? decodeURIComponent(username).toLowerCase() : null;
  }, [params.username]);

  // Effect to fetch the profile user's data based on the username in the URL
  useEffect(() => {
    if (!firestore || !usernameFromUrl) {
      if(!usernameFromUrl) setIsProfileUserLoading(false);
      return;
    }

    setIsProfileUserLoading(true);
    const usersRef = collection(firestore, 'users');
    const userQuery = query(usersRef, where("username", "==", usernameFromUrl), limit(1));

    const unsubscribe = onSnapshot(userQuery, (snapshot) => {
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        setProfileUser({ id: userDoc.id, ...userDoc.data() } as User);
      } else {
        setProfileUser(null);
      }
      setIsProfileUserLoading(false);
    }, (error) => {
      console.error("Error fetching user:", error);
      setProfileUser(null);
      setIsProfileUserLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, usernameFromUrl]);

  // Effect to check follow status
  useEffect(() => {
    if (!currentUser || !profileUser || !firestore) {
        setIsFollowStatusLoading(false);
        return;
    }
     if (currentUser.uid === profileUser.id) {
        setIsFollowing(false);
        setIsFollowStatusLoading(false);
        return;
    }

    setIsFollowStatusLoading(true);
    const followDocId = `${currentUser.uid}_${profileUser.id}`;
    const followRef = doc(firestore, 'follows', followDocId);

    const unsubscribe = onSnapshot(followRef, (docSnap) => {
        setIsFollowing(docSnap.exists());
        setIsFollowStatusLoading(false);
    }, (error) => {
        console.error("Error checking follow status:", error);
        setIsFollowStatusLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, profileUser, firestore]);

  const isCurrentUserProfile = currentUser?.uid === profileUser?.id;
  const canViewContent = isCurrentUserProfile || isFollowing;

  const userPostsQuery = useMemoFirebase(() => {
    if (!firestore || !profileUser || !canViewContent) return null;
    return query(collection(firestore, 'posts'), where("authorId", "==", profileUser.id), orderBy("createdAt", "desc"));
  }, [firestore, profileUser, canViewContent]);

  const { data: userPosts, isLoading: postsLoading } = useCollection<Post>(userPostsQuery);

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser || isFollowStatusLoading || isCurrentUserProfile || !firestore) return;

    setIsFollowStatusLoading(true);
    
    const currentUserRef = doc(firestore, 'users', currentUser.uid);
    const profileUserRef = doc(firestore, 'users', profileUser.id);
    const followDocId = `${currentUser.uid}_${profileUser.id}`;
    const followRef = doc(firestore, 'follows', followDocId);

    const batch = writeBatch(firestore);

    try {
        const followDoc = await getDoc(followRef);
        if (followDoc.exists()) {
            // Unfollow
            batch.delete(followRef);
            batch.update(currentUserRef, { followingCount: increment(-1) });
            batch.update(profileUserRef, { followerCount: increment(-1) });
        } else {
            // Follow
            batch.set(followRef, {
                followerId: currentUser.uid,
                followeeId: profileUser.id,
                createdAt: serverTimestamp()
            });
            batch.update(currentUserRef, { followingCount: increment(1) });
            batch.update(profileUserRef, { followerCount: increment(1) });
        }
        await batch.commit();
    } catch(error) {
        console.error("Failed to toggle follow", error);
    } finally {
       // isFollowStatusLoading will be set to false by the onSnapshot listener
    }
  };


  if (isProfileUserLoading) {
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
  
  const followerCount = profileUser.followerCount || 0;
  const followingCount = profileUser.followingCount || 0;


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
              <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
              <AvatarFallback>{profileUser.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            {isCurrentUserProfile ? (
                 <Button variant="outline" asChild>
                    <Link href="/home/settings">
                        <Settings className="h-4 w-4 me-2" />
                        تعديل الملف الشخصي
                    </Link>
                </Button>
            ): (
                <Button onClick={handleFollowToggle} disabled={isFollowStatusLoading} variant={isFollowing ? 'secondary' : 'default'}>
                    {isFollowStatusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                     isFollowing ? <><UserCheck className="h-4 w-4 me-2" /> متابَع</> : <><UserPlus className="h-4 w-4 me-2" /> متابعة</>}
                </Button> 
            )}
          </div>
          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-bold font-headline">{profileUser.name}</h1>
            <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
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
           ) : userPosts && userPosts.length > 0 ? (
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

    