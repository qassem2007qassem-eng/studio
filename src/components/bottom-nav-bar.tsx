
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, PlusCircle, User, Search, UserSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { type User as UserType } from '@/lib/types';
import { getCurrentUserProfile } from '@/services/user-service';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

export function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [userData, setUserData] = useState<UserType | null>(null);

  useEffect(() => {
    if (user) {
      getCurrentUserProfile().then((profile) => {
        if (profile) {
          setUserData(profile as UserType);
        }
      });
    } else {
      setUserData(null);
    }
  }, [user]);

  const username = userData?.username?.toLowerCase();

  const navItems = [
    { href: '/home', icon: Home, label: 'الرئيسية' },
    { href: '/home/friends', icon: Users, label: 'الأصدقاء' },
    { href: '/home/create-post', icon: PlusCircle, label: 'إنشاء', isSpecial: true },
    { href: '/home/groups', icon: UserSquare, label: 'مجموعات' },
    { href: `/home/profile/${username}`, icon: User, label: 'حسابي', requiresAuth: true },
  ];

  if (isUserLoading) {
    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-background/95 border-t backdrop-blur-sm z-50 md:hidden">
             <div className="container mx-auto h-full max-w-2xl px-2">
                <div className="grid h-full grid-cols-5 items-center">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <Skeleton className="h-6 w-6 rounded-md" />
                            <Skeleton className="h-3 w-10 rounded-sm" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background/95 border-t backdrop-blur-sm z-50 md:hidden">
      <div className="container mx-auto h-full max-w-2xl px-2">
        <div className="grid h-full grid-cols-5 items-center">
          {navItems.map((item) => {
            if (item.requiresAuth && (!user || (item.href.includes('/profile/') && !username))) {
                // Return a disabled-like placeholder for auth-required items when not logged in
                return <div key={item.label} className="flex flex-col items-center gap-1 opacity-50">
                    <item.icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </div>;
            }

            const isActive = pathname === item.href;
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
