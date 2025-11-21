
import { AppHeader } from "@/components/app-header-mobile";
import { Separator } from "@/components/ui/separator";
import { FeedClientContent } from "./feed-client-content";

// This page has been simplified to only render the client component,
// which now handles all of its own data fetching logic.

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <Separator />
      <FeedClientContent />
    </>
  );
}
