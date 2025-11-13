
'use client'

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Settings, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { CreatePostForm } from "@/components/create-post-form";
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, where, getFirestore, getDocs, limit, doc, writeBatch, increment, deleteDoc } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import { type User, type Post, type Follow } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from 'next/navigation';

export default function ProfilePage() {
  const params = useParams();
  const username = typeof params.username === 'string' ? params.username : '';
  const { user: currentUser } = useUser();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const firestore = getFirestore();

  useEffect(() => {
    const fetchUserAndFollowStatus = async () => {
      setIsLoading(true);
      if (!username || !firestore) {
        setIsLoading(false);
        return;
      };

      try {
        // Fetch user
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where("username", "==", username), limit(1));
        const userQuerySnapshot = await getDocs(q);
        
        let userToSet: User | null = null;
        if (!userQuerySnapshot.empty) {
          userToSet = userQuerySnapshot.docs[0].data() as User;
          setProfileUser(userToSet);
        } else {
          console.log("No such user!");
          setProfileUser(null);
          setIsLoading(false);
          return;
        }

        // Check follow status if a profile user and current user exist
        if (currentUser && userToSet) {
          const followsRef = collection(firestore, 'follows');
          const followQuery = query(followsRef, 
            where("followerId", "==", currentUser.uid), 
            where("followeeId", "==", userToSet.id), 
            limit(1)
          );
          const followQuerySnapshot = await getDocs(followQuery);

          if (!followQuerySnapshot.empty) {
            setIsFollowing(true);
            setFollowDocId(followQuerySnapshot.docs[0].id);
          } else {
            setIsFollowing(false);
            setFollowDocId(null);
          }
        }
      } catch (error) {
        console.error("Error fetching user or follow status:", error);
        setProfileUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (username && firestore) {
        fetchUserAndFollowStatus();
    }
  }, [username, firestore, currentUser]);

  const postsCollection = useMemoFirebase(() => {
    if (!profileUser) return null;
    return collection(firestore, 'posts');
  }, [firestore, profileUser]);

  const userPostsQuery = useMemoFirebase(() => {
    if (!postsCollection || !profileUser) return null;
    return query(postsCollection, where("authorId", "==", profileUser.id));
  }, [postsCollection, profileUser]);

  const { data: userPosts, isLoading: postsLoading } = useCollection<Post>(userPostsQuery);

  const isCurrentUserProfile = currentUser?.uid === profileUser?.id;

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser || isFollowLoading) return;

    setIsFollowLoading(true);

    const batch = writeBatch(firestore);
    const followerRef = doc(firestore, 'users', currentUser.uid);
    const followeeRef = doc(firestore, 'users', profileUser.id);
    
    if (isFollowing && followDocId) {
      // --- Unfollow Logic ---
      const followRef = doc(firestore, 'follows', followDocId);
      batch.delete(followRef);
      batch.update(followerRef, { followingCount: increment(-1) });
      batch.update(followeeRef, { followerCount: increment(-1) });
      
      try {
        await batch.commit();
        setIsFollowing(false);
        setFollowDocId(null);
        setProfileUser(prev => prev ? { ...prev, followerCount: prev.followerCount - 1 } : null);
      } catch (error) {
        console.error("Error unfollowing user: ", error);
      }

    } else {
      // --- Follow Logic ---
      const newFollowRef = doc(collection(firestore, 'follows'));
      batch.set(newFollowRef, {
        followerId: currentUser.uid,
        followeeId: profileUser.id,
        createdAt: new Date().toISOString()
      });
      batch.update(followerRef, { followingCount: increment(1) });
      batch.update(followeeRef, { followerCount: increment(1) });

      try {
        await batch.commit();
        setIsFollowing(true);
        setFollowDocId(newFollowRef.id);
        setProfileUser(prev => prev ? { ...prev, followerCount: prev.followerCount + 1 } : null);
      } catch (error) {
         console.error("Error following user: ", error);
      }
    }
    setIsFollowLoading(false);
  };


  if (isLoading) {
    return (
        <div className="space-y-6">
            <Card className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 relative">
                    <Skeleton className="absolute -mt-16 h-28 w-28 rounded-full border-4 border-card"/>
                    <div className="mt-16 space-y-4">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
            <Skeleton className="h-64 w-full" />
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
              <span className="font-bold text-foreground">{profileUser.followingCount || 0}</span> Following
            </div>
            <div>
              <span className="font-bold text-foreground">{profileUser.followerCount || 0}</span> Followers
            </div>
             <div>
              <span className="font-bold text-foreground">{userPosts?.length || 0}</span> Posts
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isCurrentUserProfile && <CreatePostForm />}

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
