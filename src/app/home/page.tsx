
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AppHeader } from "@/components/app-header-mobile";
import { PostCard } from "@/components/post-card";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { UserSuggestions } from "@/components/user-suggestions";
import { useUser, initializeFirebase } from "@/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { type Post, type User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getCurrentUserProfile } from "@/services/user-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { firestore } = initializeFirebase();
  const { user: currentUser, isUserLoading } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!currentUser || !firestore) {
        setIsLoading(false);
        setPosts([]);
        return;
      }
      setIsLoading(true);

      try {
        const userProfile = await getCurrentUserProfile();
        const followingIds = userProfile?.following || [];
        
        // Create a list of user IDs to fetch posts from: the current user + people they follow
        const fetchUserIds = [...new Set([currentUser.uid, ...followingIds])];
        
        let feedPosts: Post[] = [];

        // Firestore 'in' queries are limited to 30 items in 2024. 
        // If a user follows more, we need to chunk the requests.
        const chunkSize = 30;
        for (let i = 0; i < fetchUserIds.length; i += chunkSize) {
            const chunk = fetchUserIds.slice(i, i + chunkSize);
            if (chunk.length > 0) {
                 const postsQuery = query(
                    collection(firestore, "posts"),
                    where("authorId", "in", chunk)
                );
                const postsSnapshot = await getDocs(postsQuery);
                postsSnapshot.forEach(doc => {
                    feedPosts.push({ id: doc.id, ...doc.data() } as Post);
                });
            }
        }
        
        // Additionally, fetch all public posts, as the above only gets posts from followed users.
        const publicQuery = query(
          collection(firestore, "posts"),
          where("privacy", "==", "everyone")
        );
        const publicSnapshot = await getDocs(publicQuery);
        publicSnapshot.forEach(doc => {
          feedPosts.push({ id: doc.id, ...doc.data() } as Post);
        });


        // Filter posts based on privacy settings on the client side
        const filteredPosts = feedPosts.filter(post => {
            if (post.privacy === 'everyone') return true;
            if (post.authorId === currentUser.uid) return true; // User can always see their own posts
            if (post.privacy === 'followers' && followingIds.includes(post.authorId)) return true;
            return false;
        });

        // 4. Remove duplicates and sort in client-side
        const uniquePosts = Array.from(new Map(filteredPosts.map(p => [p.id, p])).values());
        uniquePosts.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA;
        });
        
        setPosts(uniquePosts);

      } catch (error) {
        console.error("Error fetching feed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isUserLoading) {
      fetchFeed();
    }
  }, [currentUser, isUserLoading, firestore]);

  return (
    <>
      <AppHeader />
      <Separator />
      <CreatePostTrigger />
      <div className="space-y-4 pt-6">
        {(isLoading || isUserLoading) && (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        )}
        {!isLoading && !isUserLoading && posts.length === 0 && (
            <div className="text-center text-muted-foreground pt-10">
                <p className="text-lg font-semibold">مرحباً بك في StudentHub!</p>
                <p className="text-sm">يبدو أن صفحتك الرئيسية فارغة.</p>
                <p className="text-sm mt-2">ابدأ بمتابعة بعض الأشخاص لترى منشوراتهم هنا.</p>
                 <Button asChild className="mt-4">
                    <Link href="/home/friends">
                        اكتشف الأصدقاء
                    </Link>
                </Button>
            </div>
        )}
        {posts?.map((post, index) => (
          <React.Fragment key={post.id}>
            <PostCard post={post} />
            {index === 1 && (
              <UserSuggestions />
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
