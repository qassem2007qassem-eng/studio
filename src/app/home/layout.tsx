import { BottomNavBar } from "@/components/bottom-nav-bar";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary/50 dark:bg-background">
      <main className="container mx-auto max-w-2xl px-4 py-8 pb-24">
        <div className="space-y-6">
            {children}
        </div>
      </main>
      <BottomNavBar />
    </div>
  );
}
