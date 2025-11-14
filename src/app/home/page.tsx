
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

        // IDs to query: current user (for their own posts), and people they follow
        const authorIdsToQuery = [currentUser.uid, ...followingIds];

        let feedPosts: Post[] = [];

        // 1. Fetch public posts from everyone
        const publicQuery = query(
          collection(firestore, "posts"),
          where("privacy", "==", "everyone"),
          orderBy("createdAt", "desc")
        );
        const publicSnapshot = await getDocs(publicQuery);
        publicSnapshot.forEach(doc => {
          feedPosts.push({ id: doc.id, ...doc.data() } as Post);
        });
        
        // 2. Fetch 'followers-only' posts from followed users, if any
        if (followingIds.length > 0) {
            const followersQuery = query(
              collection(firestore, "posts"),
              where("authorId", "in", followingIds),
              where("privacy", "==", "followers"),
              orderBy("createdAt", "desc")
            );
            const followersSnapshot = await getDocs(followersQuery);
            followersSnapshot.forEach(doc => {
              feedPosts.push({ id: doc.id, ...doc.data() } as Post);
            });
        }
        
        // 3. Fetch current user's 'only_me' and 'followers' posts
        const myPostsQuery = query(
            collection(firestore, 'posts'),
            where('authorId', '==', currentUser.uid),
            where('privacy', 'in', ['only_me', 'followers']),
            orderBy('createdAt', 'desc')
        );
        const myPostsSnapshot = await getDocs(myPostsQuery);
        myPostsSnapshot.forEach(doc => {
            feedPosts.push({ id: doc.id, ...doc.data() } as Post);
        });


        // 4. Remove duplicates and sort
        const uniquePosts = Array.from(new Map(feedPosts.map(p => [p.id, p])).values());
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
                <p>لا توجد منشورات لعرضها.</p>
                <p className="text-sm">ابدأ بمتابعة بعض الأشخاص أو قم بإنشاء منشورك الأول!</p>
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
