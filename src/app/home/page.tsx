
"use client";

import { AppHeader } from "@/components/app-header-mobile";
import { PostCard } from "@/components/post-card";
import { StoriesCarousel } from "@/components/stories-carousel";
import { CreatePostTrigger } from "@/components/create-post-trigger";
import { useCollection } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase/provider";
import { type Post } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const { firestore } = useFirebase();

  const postsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'posts');
  }, [firestore]);

  const postsQuery = useMemoFirebase(() => {
    if (!postsCollection) return null;
    return query(postsCollection, orderBy("createdAt", "desc"));
  }, [postsCollection]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  return (
    <>
      <AppHeader />
      <StoriesCarousel />
      <Separator />
      <CreatePostTrigger />
      <div className="space-y-4 pt-6">
        {isLoading && (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        )}
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </>
  );
}
