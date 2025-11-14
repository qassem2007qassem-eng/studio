
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { AppHeader } from "@/components/app-header-mobile";
import { PostCard } from "@/components/post-card";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { UserSuggestions } from "@/components/user-suggestions";
import { useUser } from "@/firebase";
import { type Post } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getCurrentUserProfile } from "@/services/user-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getFeedPosts } from "@/services/post-service";
import { type DocumentSnapshot } from "firebase/firestore";
import { CatLoader } from "@/components/cat-loader";

export default function HomePage() {
  const { user: currentUser, isUserLoading } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef<IntersectionObserver>();
  
  const lastPostElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        loadMorePosts();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMore]);


  const fetchInitialFeed = async () => {
      if (!currentUser) {
        setIsLoading(false);
        setPosts([]);
        return;
      }
      setIsLoading(true);

      try {
        const userProfile = await getCurrentUserProfile({ forceRefresh: true });
        const { posts: newPosts, lastVisible: newLastVisible, hasMore: newHasMore } = await getFeedPosts(userProfile, 10);
        setPosts(newPosts);
        setLastVisible(newLastVisible);
        setHasMore(newHasMore);
      } catch (error) {
        console.error("Error fetching initial feed:", error);
      } finally {
        setIsLoading(false);
      }
  };
  
  const loadMorePosts = async () => {
    if (!currentUser || !lastVisible || !hasMore) return;

    setIsLoadingMore(true);
    try {
        const userProfile = await getCurrentUserProfile();
        const { posts: newPosts, lastVisible: newLastVisible, hasMore: newHasMore } = await getFeedPosts(userProfile, 10, lastVisible);
        
        setPosts(prevPosts => {
          const postIds = new Set(prevPosts.map(p => p.id));
          const uniqueNewPosts = newPosts.filter(p => !postIds.has(p.id));
          return [...prevPosts, ...uniqueNewPosts];
        });

        setLastVisible(newLastVisible);
        setHasMore(newHasMore);

    } catch (error) {
        console.error("Error loading more posts:", error);
    } finally {
        setIsLoadingMore(false);
    }
  };


  useEffect(() => {
    if (!isUserLoading) {
      fetchInitialFeed();
    }
  }, [currentUser, isUserLoading]);

  return (
    <>
      <AppHeader />
      <Separator />
      <CreatePostTrigger />
      <div className="space-y-4 pt-6">
        {(isLoading || isUserLoading) && (
          <div className="flex justify-center items-center py-10">
            <CatLoader />
          </div>
        )}
        {!isLoading && !isUserLoading && posts.length === 0 && (
            <div className="text-center text-muted-foreground pt-10">
                <p className="text-lg font-semibold">مرحباً بك في StudentHub!</p>
                <p className="text-sm">صفحتك الرئيسية فارغة حالياً.</p>
                <p className="text-sm mt-2">ابدأ بمتابعة بعض الأشخاص لترى منشوراتهم هنا.</p>
                 <Button asChild className="mt-4">
                    <Link href="/home/friends">
                        اكتشف الأصدقاء
                    </Link>
                </Button>
            </div>
        )}
        {posts?.map((post, index) => {
           const isLastElement = index === posts.length - 1;
           return (
              <React.Fragment key={post.id}>
                <div ref={isLastElement ? lastPostElementRef : null}>
                    <PostCard post={post} />
                </div>
                {index === 1 && (
                  <UserSuggestions />
                )}
              </React.Fragment>
           )
        })}
         {isLoadingMore && (
          <div className="flex justify-center items-center py-4">
              <CatLoader />
          </div>
        )}
         {!isLoading && hasMore && posts.length > 0 && !isLoadingMore && (
             <div className="text-center">
                 <Button onClick={loadMorePosts} variant="secondary">تحميل المزيد</Button>
             </div>
         )}
         {!hasMore && posts.length > 0 && (
              <p className="text-center text-muted-foreground py-4">لقد وصلت إلى النهاية!</p>
         )}
      </div>
    </>
  );
}
