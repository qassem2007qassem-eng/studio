
import { AppHeader } from "@/components/app-header-mobile";
import { Separator } from "@/components/ui/separator";
import { FeedClientContent } from "./feed-client-content";

// This page is now a simple container. It passes control to the Client Component
// which is responsible for all data fetching and rendering logic.
// This avoids Server-Side data fetching complexity that was causing crashes.

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <Separator />
      
      {/*
        The FeedClientContent component is now fully responsible for its own data.
        We pass it an empty initial state, and it will fetch everything it needs
        on the client side. This is a more robust pattern for this page.
      */}
      <FeedClientContent
        initialPosts={[]}
        initialHasMore={true}
      />
    </>
  );
}
