
'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from './theme-toggle';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-4 md:hidden">
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/home">
            <Logo />
        </Link>
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
           <Button variant="ghost" size="icon" disabled>
              <Bell />
              <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
