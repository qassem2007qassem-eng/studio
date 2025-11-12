import { AppHeader } from "@/components/app-header";
import { MainNav } from "@/components/main-nav";
import { RightSidebar } from "@/components/right-sidebar";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary/50 dark:bg-background">
      <AppHeader />
      <div className="container mx-auto grid grid-cols-12 items-start gap-6 px-4 py-8">
        <aside className="sticky top-24 col-span-3 hidden lg:block">
          <MainNav />
        </aside>
        <main className="col-span-12 lg:col-span-6 space-y-6">
            {children}
        </main>
        <aside className="col-span-3 hidden lg:block">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
