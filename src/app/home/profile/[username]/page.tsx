
'use client'

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Settings, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, limit, doc, writeBatch, serverTimestamp, deleteDoc, orderBy } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import { type User, type Post, type Follow } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from 'next/navigation';
import { useFirestore } from "@/firebase/provider";

export default function ProfilePage() {
  const params = useParams();
  const usernameFromUrl = useMemo(() => {
    const username = Array.isArray(params.username) ? params.username[0] : params.username;
    return username ? decodeURIComponent(username).toLowerCase() : '';
  }, [params.username]);
  
  const { user: currentUser } = useUser();
  const firestore = useFirestore();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState<string | null>(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Effect to fetch the profile user based on username
  useEffect(() => {
    if (!usernameFromUrl || !firestore) {
      setIsUserLoading(false);
      return;
    }
    
    setIsUserLoading(true);
    setProfileUser(null); 

    const usersRef = collection(firestore, 'users');
    const userQuery = query(usersRef, where("username", "==", usernameFromUrl), limit(1));

    getDocs(userQuery).then(querySnapshot => {
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as User;
        const userId = querySnapshot.docs[0].id;
        setProfileUser({ ...userData, id: userId });
      } else {
        setProfileUser(null);
      }
    }).catch((error) => {
        console.error("Error fetching user:", error);
        setProfileUser(null);
    }).finally(() => {
        setIsUserLoading(false);
    });

  }, [usernameFromUrl, firestore]);


  // Effect to check follow status
  useEffect(() => {
      if (!currentUser || !profileUser || currentUser.uid === profileUser.id || !firestore) {
        setIsFollowing(false);
        setFollowDocId(null);
        return;
      };
      
      setIsFollowLoading(true);
      const followsRef = collection(firestore, 'follows');
      const followQuery = query(followsRef, 
          where("followerId", "==", currentUser.uid), 
          where("followeeId", "==", profileUser.id), 
          limit(1)
      );

      const unsubscribe = onSnapshot(followQuery, (snapshot) => {
          if (!snapshot.empty) {
              setIsFollowing(true);
              setFollowDocId(snapshot.docs[0].id);
          } else {
              setIsFollowing(false);
              setFollowDocId(null);
          }
          setIsFollowLoading(false);
      }, (err) => {
          console.error("Error checking follow status:", err);
          setIsFollowing(false);
          setFollowDocId(null);
          setIsFollowLoading(false);
      });
      
      return () => unsubscribe();
  }, [currentUser, profileUser, firestore]);

  const userPostsQuery = useMemoFirebase(() => {
    if (!firestore || !profileUser) return null;
    return query(collection(firestore, 'posts'), where("authorId", "==", profileUser.id), orderBy("createdAt", "desc"));
  }, [firestore, profileUser]);

  const { data: userPosts, isLoading: postsLoading } = useCollection<Post>(userPostsQuery);
  
  // Memoize follower/following counts
  const { followerCount, followingCount } = useMemo(() => {
      return {
          followerCount: profileUser?.followerCount || 0,
          followingCount: profileUser?.followingCount || 0,
      }
  }, [profileUser]);


  const isCurrentUserProfile = currentUser?.uid === profileUser?.id;

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser || isFollowLoading || isCurrentUserProfile || !firestore) return;

    setIsFollowLoading(true);
    
    const currentUserRef = doc(firestore, 'users', currentUser.uid);
    const profileUserRef = doc(firestore, 'users', profileUser.id);
    const batch = writeBatch(firestore);

    if (isFollowing && followDocId) {
      // --- Unfollow Logic ---
      const followRef = doc(firestore, 'follows', followDocId);
      batch.delete(followRef);
      batch.update(currentUserRef, { followingCount: increment(-1) });
      batch.update(profileUserRef, { followerCount: increment(-1) });

    } else {
      // --- Follow Logic ---
      const newFollowRef = doc(collection(firestore, 'follows'));
      batch.set(newFollowRef, {
        id: newFollowRef.id,
        followerId: currentUser.uid,
        followeeId: profileUser.id,
        createdAt: serverTimestamp()
      });
      batch.update(currentUserRef, { followingCount: increment(1) });
      batch.update(profileUserRef, { followerCount: increment(1) });
    }

    try {
        await batch.commit();
    } catch(error) {
        console.error("Failed to toggle follow", error);
    } finally {
        setIsFollowLoading(false);
    }
  };


  if (isUserLoading) {
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
                <Button onClick={handleFollowToggle} disabled={isFollowLoading} variant={isFollowing ? 'secondary' : 'default'}>
                    {isFollowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                     isFollowing ? <><UserCheck className="h-4 w-4 me-2" /> متابَع</> : <><UserPlus className="h-4 w-4 me-2" /> متابعة</>}
                </Button> 
            )}
          </div>
          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-bold font-headline">{profileUser.name}</h1>
            <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
            <p className="pt-2">{profileUser.bio || "لا يوجد نبذة تعريفية."}</p>
          </div>
          <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
            <div>
              <span className="font-bold text-foreground">{followingCount}</span> متابِع
            </div>
            <div>
              <span className="font-bold text-foreground">{followerCount}</span> متابَع
            </div>
             <div>
              <span className="font-bold text-foreground">{userPosts?.length || 0}</span> منشور
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
           {postsLoading ? <Skeleton className="h-40 w-full" /> : 
           userPosts && userPosts.length > 0 ? (
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
