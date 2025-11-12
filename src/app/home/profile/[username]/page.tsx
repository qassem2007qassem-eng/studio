
'use client'

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Settings, UserPlus } from "lucide-react";
import { CreatePostForm } from "@/components/create-post-form";
import { useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getFirestore, getDocs, limit } from "firebase/firestore";
import { useEffect, useState } from "react";
import { type User, type Post } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;
  const { user: currentUser } = useUser();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const firestore = getFirestore();

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      if (!username) {
        setIsLoading(false);
        return;
      };
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where("username", "==", username), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        setProfileUser(userDoc.data() as User);
      } else {
        console.log("No such user!");
        // Handle user not found, maybe redirect or show a "Not Found" page
      }
      setIsLoading(false);
    };

    if (username) {
        fetchUser();
    }
  }, [username, firestore]);

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
                <Button>
                    <UserPlus className="h-4 w-4 me-2" />
                    متابعة
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
