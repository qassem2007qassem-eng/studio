
import { AppHeader } from "@/components/app-header-mobile";
import { Separator } from "@/components/ui/separator";
import { getFeedPosts } from "@/services/post-service";
import { FeedClientContent } from "./feed-client-content";

export const revalidate = 60; // Revalidate the data every 60 seconds

export default async function HomePage() {
  // Fetch initial posts on the server
  const { posts, lastVisible, hasMore } = await getFeedPosts(10);

  return (
    <>
      <AppHeader />
      <Separator />
      
      <FeedClientContent
        initialPosts={posts}
        initialLastVisible={lastVisible}
        initialHasMore={hasMore}
      />
    </>
  );
}

