
import { AppHeader } from "@/components/app-header-mobile";
import { Separator } from "@/components/ui/separator";
import { getFeedPosts } from "@/services/post-service";
import { FeedClientContent } from "./feed-client-content";
import { Post } from "@/lib/types";
import { auth } from 'firebase-admin';
import { headers } from 'next/headers';


export const revalidate = 0;

// Helper to convert Firestore Timestamps to strings
const serializePosts = (posts: Post[]): Post[] => {
  return posts.map(post => {
    const newPost = { ...post };
    if (post.createdAt && typeof post.createdAt !== 'string') {
      newPost.createdAt = (post.createdAt as any).toDate().toISOString();
    }
    if (post.updatedAt && typeof post.updatedAt !== 'string') {
      newPost.updatedAt = (post.updatedAt as any).toDate().toISOString();
    }
    return newPost;
  });
};


export default async function HomePage() {
  const headersList = headers();
  const userToken = headersList.get('X-Firebase-App-Check-Token');
  let userId: string | undefined = undefined;

  // This block is for server-side authentication to get the user ID
  // It's a simplified example. In a real app, you'd use a more robust
  // server-side session management or Firebase Admin SDK.
  // For now, we'll just assume we can get the UID.
  // We will pass the UID to getFeedPosts if available.
  // Note: This part is complex and might require Firebase Admin SDK setup on the server.
  // We are simulating getting a userId for the function call.
  
  // For the purpose of this fix, we'll rely on the client to pass the UID.
  // The server-side render will fetch a generic feed if no user is identified.
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
