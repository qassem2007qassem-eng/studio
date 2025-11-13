
'use client';

import Link from 'next/link';
import {
  Bell,
  Home,
  LogOut,
  User,
  Settings,
  PlusCircle,
  Users,
  PlaySquare,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Logo } from '@/components/logo';
import { ThemeToggle } from './theme-toggle';
import { useUser, useAuth, useFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { useRouter } from 'next/navigation';
import { Separator } from './ui/separator';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { type User as UserType } from '@/lib/types';


export function AppHeader() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const auth = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserType | null>(null);

  useEffect(() => {
    if(user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((doc) => {
        if(doc.exists()) {
          setUserData(doc.data() as UserType);
        }
      })
    }
  }, [user, firestore])


  const mockNotifications: any[] = [];

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
    router.push('/login');
  };
  
  const username = userData?.username;


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        {/* Left Section - Logo and Actions */}
        <div className="flex items-center gap-2">
            <Link href="/home">
                <Logo />
            </Link>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/home/create-post')}>
                    <PlusCircle />
                    <span className="sr-only">Create</span>
                </Button>
            </div>
        </div>

        {/* Center Section - Main Navigation Tabs */}
        <div className="flex-1 max-w-lg hidden md:block">
             <div className="grid grid-cols-4 gap-2">
                <Button variant="ghost" className="h-12 w-full rounded-lg relative flex-col gap-1" asChild>
                    <Link href="/home">
                        <Home className="h-6 w-6" />
                         <span className="text-xs">الرئيسية</span>
                        <div className="absolute bottom-0 h-1 w-3/4 bg-primary rounded-t-full"></div>
                    </Link>
                </Button>
                 <Button variant="ghost" className="h-12 w-full rounded-lg flex-col gap-1 text-muted-foreground" disabled>
                     <Users className="h-6 w-6" />
                     <span className="text-xs">الأصدقاء</span>
                </Button>
                 <Button variant="ghost" className="h-12 w-full rounded-lg flex-col gap-1 text-muted-foreground" disabled>
                     <PlaySquare className="h-6 w-6" />
                      <span className="text-xs">الفيديو</span>
                </Button>
                 <Button variant="ghost" className="h-12 w-full rounded-lg flex-col gap-1 text-muted-foreground" asChild>
                     <Link href={`/home/profile/${username}`}>
                        <User className="h-6 w-6" />
                        <span className="text-xs">الملف الشخصي</span>
                    </Link>
                </Button>
             </div>
        </div>
        
        {/* Right Section - Profile & Notifications */}
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell />
                {mockNotifications.length > 0 && (
                    <span className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-xs text-white" />
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">الإشعارات</h4>
                <div className="text-sm text-center text-muted-foreground p-4">
                  لا توجد إشعارات جديدة بعد.
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {isUserLoading || (user && !userData) ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : user && userData ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link href={`/home/profile/${username}`}>
                    <div className="flex items-center gap-3">
                         <Avatar className="h-12 w-12">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
                            <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-base font-semibold leading-none">{user.displayName}</p>
                            <p className="text-sm leading-none text-muted-foreground">عرض ملفك الشخصي</p>
                        </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 <DropdownMenuItem asChild>
                  <Link href="/home/settings">
                    <Settings className="ms-2 text-muted-foreground" />
                    <span>الإعدادات والخصوصية</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="ms-2 text-muted-foreground" />
                    <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Button asChild>
                <Link href="/login">تسجيل الدخول</Link>
             </Button>
          )}
        </div>
      </div>
    </header>
  );
}
