
"use client";

import { PostCard } from "@/components/post-card";
import { StoriesCarousel } from "@/components/stories-carousel";
import { CreatePostForm } from "@/components/create-post-form";
import { useCollection } from "@/firebase";
import { collection, query, orderBy, getFirestore } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase/provider";
import { type Post } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { firestore } = useFirebase();

  const postsCollection = useMemoFirebase(() => {
    return collection(firestore, 'posts');
  }, [firestore]);

  const postsQuery = useMemoFirebase(() => {
    if (!postsCollection) return null;
    return query(postsCollection, orderBy("createdAt", "desc"));
  }, [postsCollection]);

  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  return (
    <>
      <StoriesCarousel />
      <CreatePostForm />
      <div className="space-y-6">
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
