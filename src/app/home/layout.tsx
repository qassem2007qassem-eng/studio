import { AppHeader } from "@/components/app-header";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary/50 dark:bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
            {children}
        </div>
      </main>
    </div>
  );
}
