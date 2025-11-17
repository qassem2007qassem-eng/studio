
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, PlusCircle, User, UserSquare, BookOpenCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { type User as UserType } from '@/lib/types';
import { getCurrentUserProfile } from '@/services/user-service';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

export function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [username, setUsername] = useState<string | null | undefined>(undefined); // undefined means we haven't checked yet

  useEffect(() => {
    if (isUserLoading) {
        setUsername(undefined); // Reset on user change
        return;
    }
    if (user) {
      // Teachers also have a user profile, so this should work for both
      getCurrentUserProfile().then((profile) => {
        setUsername(profile?.username?.toLowerCase() || null);
      });
    } else {
      setUsername(null); // Explicitly set to null when logged out
    }
  }, [user, isUserLoading]);

  const navItems = [
    { href: '/home', icon: Home, label: 'الرئيسية' },
    { href: '/home/content', icon: BookOpenCheck, label: 'المحتوى' },
    { href: '/home/create-post', icon: PlusCircle, label: 'إنشاء', isSpecial: true },
    { href: '/home/groups', icon: UserSquare, label: 'مجموعات' },
    { href: username ? `/home/profile/${username}` : '/login', icon: User, label: 'حسابي', requiresAuth: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background/95 border-t backdrop-blur-sm z-50 md:hidden">
      <div className="container mx-auto h-full max-w-2xl px-2">
        <div className="grid h-full grid-cols-5 items-center">
          {navItems.map((item) => {
            const isProfileLinkAndNotReady = item.requiresAuth && username === undefined;
            
            if (isProfileLinkAndNotReady) {
               return <div key={item.label} className="flex flex-col items-center gap-1 opacity-50">
                    <item.icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </div>;
            }

            const isActive = item.isSpecial ? pathname.startsWith(item.href) : pathname === item.href;
            const Icon = item.icon;
            
            if (item.isSpecial) {
              return (
                <div key={item.href} className="flex justify-center">
                   <Button 
                      size="lg" 
                      className="h-14 w-14 rounded-full shadow-lg"
                      onClick={() => router.push(item.href)}
                      disabled={!user}
                    >
                      <Icon className="h-8 w-8" />
                      <span className="sr-only">{item.label}</span>
                   </Button>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center text-center gap-1 transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary',
                  !user && item.requiresAuth ? 'pointer-events-none opacity-50' : ''
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
