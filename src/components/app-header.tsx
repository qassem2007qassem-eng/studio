
import Link from 'next/link';
import {
  Bell,
  Home,
  MessageSquareText,
  Search,
  Users,
  LogOut,
  User,
  PlusCircle,
  Settings,
} from 'lucide-react';

import { getCurrentUser, mockNotifications } from '@/lib/data';
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
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/logo';
import { ThemeToggle } from './theme-toggle';

export function AppHeader() {
  const user = getCurrentUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2">
            <Logo />
             <div className="relative hidden md:block">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث..." className="ps-10" />
            </div>
        </div>

        <nav className="flex-1 justify-center hidden md:flex">
            <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" className="h-12 w-24 rounded-lg" asChild>
                    <Link href="/home">
                        <Home className="h-6 w-6" />
                        <span className="sr-only">الصفحة الرئيسية</span>
                    </Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-12 w-24 rounded-lg" asChild>
                    <Link href="/home/friends">
                        <Users className="h-6 w-6" />
                        <span className="sr-only">طلبات الصداقة</span>
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
                <div className="space-y-2">
                  {mockNotifications.map((notif) => (
                    <div key={notif.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={notif.user.avatarUrl} alt={notif.user.name} />
                        <AvatarFallback>{notif.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <p>
                          <strong>{notif.user.name}</strong>{' '}
                          {notif.action === 'liked' ? 'أعجب بمنشورك:' : notif.action === 'commented' ? 'علّق على منشورك:' : 'بدأ بمتابعتك.'}
                          {notif.postContent && <span className="text-muted-foreground"> "{notif.postContent}"</span>}
                        </p>
                      </div>
                       <div className="text-xs text-muted-foreground">{notif.createdAt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">@{user.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/home/profile/${user.username}`}>
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
              <DropdownMenuItem asChild>
                <Link href="/">
                  <LogOut className="ms-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
