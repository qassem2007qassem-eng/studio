
'use client';

import Link from 'next/link';
import {
  Bell,
  Home,
  LogOut,
  User,
  Settings,
  Search,
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
import { useUser, useAuth } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const mockNotifications: any[] = [];

  const handleLogout = () => {
    auth.signOut();
    router.push('/login');
  };
  
  const username = user?.email?.split('@')[0];


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2">
            <Logo />
             <Link href="/home/search" className="relative hidden md:block">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Button variant="outline" className="ps-10 w-full justify-start text-muted-foreground font-normal">بحث...</Button>
            </Link>
        </div>

        <nav className="flex-1 justify-center hidden md:flex">
            <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" className="h-12 w-24 rounded-lg" asChild>
                    <Link href="/home">
                        <Home className="h-6 w-6" />
                        <span className="sr-only">الصفحة الرئيسية</span>
                    </Link>
                </Button>
            </div>
        </nav>
        
        <div className="flex flex-1 items-center justify-end gap-2">
           <Button variant="ghost" size="icon" className="md:hidden" asChild>
            <Link href="/home/search">
              <Search className="h-5 w-5" />
              <span className="sr-only">بحث</span>
            </Link>
          </Button>
          <ThemeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {mockNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {mockNotifications.length}
                    </span>
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

          {isUserLoading ? (
            <Skeleton className="h-9 w-9 rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">@{username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/home/profile/${username}`}>
                    <User className="ms-2 h-4 w-4" />
                    <span>الملف الشخصي</span>
                  </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/home/settings">
                    <Settings className="ms-2 h-4 w-4" />
                    <span>الإعدادات</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="ms-2 h-4 w-4" />
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
