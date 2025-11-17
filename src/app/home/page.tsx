
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { AppHeader } from "@/components/app-header-mobile";
import { PostCard } from "@/components/post-card";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { UserSuggestions } from "@/components/user-suggestions";
import { useUser } from "@/firebase";
import { type Post, type User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getCurrentUserProfile } from "@/services/user-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getFeedPosts } from "@/services/post-service";
import { type DocumentSnapshot } from "firebase/firestore";
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

export default function HomePage() {
  const { user: currentUser, isUserLoading } = useUser();
  const [userProfile, setUserProfile] = useState<User | null>(null);
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
      setIsLoading(true);
      if (!currentUser) {
        setIsLoading(false);
        setPosts([]);
        setUserProfile(null);
        return;
      }

      try {
        // Fetch posts and profile in parallel
        const [postResult, profile] = await Promise.all([
            getFeedPosts(10),
            getCurrentUserProfile({ forceRefresh: true })
        ]);
        
        setUserProfile(profile);
        setPosts(postResult.posts);
        setLastVisible(postResult.lastVisible);
        setHasMore(postResult.hasMore);

      } catch (error) {
        console.error("Error fetching initial feed:", error);
      } finally {
        setIsLoading(false);
      }
  };
  
  const loadMorePosts = async () => {
    if (!lastVisible || !hasMore) return;

    setIsLoadingMore(true);
    try {
        const { posts: newPosts, lastVisible: newLastVisible, hasMore: newHasMore } = await getFeedPosts(10, lastVisible);
        
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

  const isTeacher = userProfile?.email?.endsWith('@teacher.app.com');

  return (
    <>
      <AppHeader />
      <Separator />
      
      {currentUser && <CreatePostTrigger />}
      
      <div className="space-y-4 pt-6">
        {(isLoading || isUserLoading) && (
          <div className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}
        
        {!isUserLoading && !currentUser && (
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

        {currentUser && !isLoading && posts.length === 0 && !isTeacher && (
           <UserSuggestions />
        )}

        {currentUser && !isLoading && posts.length === 0 && isTeacher && (
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
                {index === 1 && !isTeacher && (
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
