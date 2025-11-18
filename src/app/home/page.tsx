
import { AppHeader } from "@/components/app-header-mobile";
import { Separator } from "@/components/ui/separator";
import { getFeedPosts } from "@/services/post-service";
import { FeedClientContent } from "./feed-client-content";
import { Post } from "@/lib/types";

export const revalidate = 0;

// Helper to convert Firestore Timestamps to strings
const serializePosts = (posts: Post[]): Post[] => {
  return posts.map(post => {
    const newPost = { ...post };
    if (post.createdAt && typeof post.createdAt !== 'string') {
      newPost.createdAt = (post.createdAt as any).toDate().toISOString();
    }
    if (post.updatedAt && typeof post.updatedAt !== 'string' && post.updatedAt) {
      newPost.updatedAt = (post.updatedAt as any).toDate().toISOString();
    }
    return newPost;
  });
};


export default async function HomePage() {
  // Fetch initial posts for non-logged-in users or as a general fallback.
  // The client will take over fetching the personalized feed.
  const { posts, hasMore } = await getFeedPosts(10, null, undefined);
  const serializedPosts = serializePosts(posts);

  return (
    <>
      <AppHeader />
      <Separator />
      
      <FeedClientContent
        initialPosts={serializedPosts}
        initialHasMore={hasMore}
      />
    </>
  );
}
