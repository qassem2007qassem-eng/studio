
import { AppHeader } from "@/components/app-header-mobile";
import { Separator } from "@/components/ui/separator";
import { getFeedPosts } from "@/services/post-service";
import { FeedClientContent } from "./feed-client-content";
import { Post } from "@/lib/types";
import { headers } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin';

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
  initializeAdminApp();
  const headersList = headers();
  const sessionCookie = headersList.get('X-Session-Cookie');
  let userId: string | undefined = undefined;

  if (sessionCookie) {
    try {
      const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
      userId = decodedToken.uid;
    } catch (error) {
      // Session cookie is invalid.
      console.log("Could not verify session cookie:", error);
      userId = undefined;
    }
  }
  
  const { posts, hasMore } = await getFeedPosts(10, null, userId);
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
