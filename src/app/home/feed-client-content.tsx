
'use client';

import React, { useEffect, useState, useCallback, useRef } from "react";
import { PostCard } from "@/components/post-card";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { UserSuggestions } from "@/components/user-suggestions";
import { useUser } from "@/firebase";
import { type Post, type User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserProfile } from "@/services/user-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getFeedPosts } from "@/services/post-service";
import { type DocumentData, type DocumentSnapshot } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Edit } from "lucide-react";

function PostSkeleton() {
  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="grid gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-8 w-full" />
      </CardFooter>
    </Card>
  )
}

interface FeedClientContentProps {
    initialPosts: Post[];
    initialHasMore: boolean;
}

export function FeedClientContent({ initialPosts, initialHasMore }: FeedClientContentProps) {
  const { user: currentUser, isUserLoading } = useUser();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

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
  
  useEffect(() => {
    if (!isUserLoading) {
      if (currentUser) {
        getCurrentUserProfile({ forceRefresh: true }).then(profile => {
          setUserProfile(profile);
          setIsProfileLoading(false);
        });
      } else {
        setIsProfileLoading(false);
        setUserProfile(null);
      }
    }
  }, [currentUser, isUserLoading]);
  
  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMore || !currentUser) return;
    setIsLoadingMore(true);

    let currentLastVisible = lastVisible;

    // This logic ensures that pagination works correctly even with initial server-rendered posts.
    // It fetches the first page on the client to get a valid 'lastVisible' snapshot.
    if (posts.length > 0 && !currentLastVisible) {
        try {
            const firstPage = await getFeedPosts(10, undefined, currentUser.uid);
            currentLastVisible = firstPage.lastVisible;
            setPosts(firstPage.posts); // Replace initial server posts with fresh client ones to get snapshot
            setHasMore(firstPage.hasMore);
        } catch (error) {
            console.error("Error fetching first page on client:", error);
            setIsLoadingMore(false);
            return;
        }
    }

    if (!currentLastVisible) {
        setIsLoadingMore(false);
        return;
    }

    try {
        const { posts: newPosts, lastVisible: newLastVisible, hasMore: newHasMore } = await getFeedPosts(10, currentLastVisible, currentUser.uid);
        
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

  const isTeacher = userProfile?.email?.endsWith('@teacher.app.com');
  const isInitialLoad = (isUserLoading || isProfileLoading);
  const noPostsAndIsTeacher = !isInitialLoad && currentUser && posts.length === 0 && isTeacher;

  return (
    <div className="space-y-4 pt-6">
      {currentUser && <CreatePostTrigger />}
      
      {isInitialLoad && (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}
      
      {!isInitialLoad && !currentUser && (
          <Card>
              <CardHeader>
                  <div className="flex flex-col items-center text-center gap-2">
                      <LogIn className="h-12 w-12 text-primary"/>
                      <CardTitle>مرحباً بك في مجمع الطلاب</CardTitle>
                      <CardDescription>
                          سجل دخولك أو أنشئ حساباً جديداً لترى آخر المنشورات من أصدقائك وتشارك أفكارك.
                      </CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-2">
                   <Button asChild className="w-full">
                      <Link href="/login">تسجيل الدخول</Link>
                  </Button>
                   <Button asChild variant="secondary" className="w-full">
                      <Link href="/register">إنشاء حساب جديد</Link>
                  </Button>
              </CardContent>
          </Card>
      )}

      {!isInitialLoad && currentUser && posts.length === 0 && userProfile && userProfile.following.length === 0 && !isTeacher && (
         <UserSuggestions />
      )}

      {noPostsAndIsTeacher && (
         <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                  <Edit className="h-10 w-10 mx-auto mb-4" />
                  لم تقم بنشر أي شيء بعد. ابدأ بالتفاعل مع طلابك!
              </CardContent>
          </Card>
      )}
      
      {posts?.map((post, index) => {
         const isLastElement = index === posts.length - 1;
         return (
            <React.Fragment key={post.id}>
              <div ref={isLastElement ? lastPostElementRef : null}>
                  <PostCard post={post} />
              </div>
              {index === 1 && currentUser && userProfile && userProfile.following.length > 0 && !isTeacher && (
                <UserSuggestions />
              )}
            </React.Fragment>
         )
      })}
       {isLoadingMore && (
        <div className="space-y-4">
          <PostSkeleton />
        </div>
      )}
       {!hasMore && posts.length > 0 && (
            <p className="text-center text-muted-foreground py-4">لقد وصلت إلى النهاية!</p>
       )}
    </div>
  );
}
