
'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from './theme-toggle';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NotificationsSheet } from './notifications-sheet';
import { useUser, useCollection, useMemoFirebase, initializeFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export function AppHeader() {
  const router = useRouter();
  const { user } = useUser();
  const { firestore } = useMemoFirebase(() => initializeFirebase(), []);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      where('isRead', '==', false)
    );
  }, [user, firestore]);

  const { data: unreadNotifications } = useCollection(notificationsQuery);
  const hasUnread = (unreadNotifications?.length || 0) > 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-4 md:hidden">
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/home">
            <Logo />
        </Link>
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" disabled={!user}>
                    <div className="relative">
                        <Bell />
                        {hasUnread && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />}
                    </div>
                    <span className="sr-only">Notifications</span>
                </Button>
            </SheetTrigger>
            <NotificationsSheet />
          </Sheet>
        </div>
      </div>
    </header>
  );
}
