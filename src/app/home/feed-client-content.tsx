
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
import { LogIn, Edit, Loader2 } from "lucide-react";
import { safeToDate } from "@/lib/utils";

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

const POSTS_PER_PAGE = 3;

export function FeedClientContent() {
  const { user: currentUser, isUserLoading } = useUser();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  
  useEffect(() => {
    if (!isUserLoading) {
      if (currentUser) {
        getCurrentUserProfile().then(profile => {
          setUserProfile(profile);
          setIsProfileLoading(false);
        });
      } else {
        setIsProfileLoading(false);
        setUserProfile(null);
      }
    }
  }, [currentUser, isUserLoading]);

  const fetchInitialFeed = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      const { posts: newPosts, lastVisible: newLastVisible, hasMore: newHasMore } = await getFeedPosts(POSTS_PER_PAGE, undefined, currentUser?.uid);
      
      setPosts(newPosts);
      setLastVisible(newLastVisible);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("Error fetching initial feed:", error);
      setHasMore(false);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [currentUser?.uid]);
  
  useEffect(() => {
    fetchInitialFeed();
  }, [fetchInitialFeed]);

  
  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMore || !lastVisible) return;
    setIsLoadingMore(true);

    try {
        const { posts: newPosts, lastVisible: newLastVisible, hasMore: newHasMore } = await getFeedPosts(POSTS_PER_PAGE, lastVisible, currentUser?.uid);
        
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

  const isTeacher = userProfile?.accountType === 'teacher';
  const isInitialLoad = (isUserLoading || isProfileLoading || isLoadingFeed);
  const noPostsAndIsTeacher = !isInitialLoad && currentUser && posts.length === 0 && isTeacher;
  const noPostsAndIsStudent = !isInitialLoad && currentUser && posts.length === 0 && userProfile && userProfile.following.length === 0 && !isTeacher;


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

      {noPostsAndIsStudent && (
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
         return (
            <React.Fragment key={post.id}>
              <div>
                  <PostCard post={post} />
              </div>
              {/* Insert user suggestions after the second post if conditions are met */}
              {index === 1 && !isTeacher && <UserSuggestions />}
            </React.Fragment>
         )
      })}

      {hasMore && !isLoadingFeed && (
        <div className="flex justify-center">
            <Button onClick={loadMorePosts} disabled={isLoadingMore}>
                {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "تحميل المزيد"}
            </Button>
        </div>
       )}

       {!hasMore && posts.length > 0 && !isLoadingFeed && (
            <p className="text-center text-muted-foreground py-4">لقد وصلت إلى النهاية!</p>
       )}
        {!isInitialLoad && currentUser && posts.length === 0 && !noPostsAndIsStudent && !noPostsAndIsTeacher && (
           <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                  <Edit className="h-10 w-10 mx-auto mb-4" />
                  <p>صفحتك الرئيسية فارغة.</p>
                  <p className="text-sm">ابدأ بمتابعة بعض المستخدمين لترى منشوراتهم هنا.</p>
              </CardContent>
          </Card>
        )}
    </div>
  );
}
