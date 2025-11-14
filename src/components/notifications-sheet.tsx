
'use client';

import { useEffect } from 'react';
import { collection, query, orderBy, where, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { useUser, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { type AppNotification } from '@/lib/types';
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, cn } from '@/lib/utils';
import { Heart, MessageCircle, UserPlus, BellOff } from 'lucide-react';
import { markNotificationsAsRead } from '@/services/notification-service';

const NotificationIcon = ({ type }: { type: AppNotification['action'] }) => {
  switch (type) {
    case 'liked':
      return <Heart className="h-5 w-5 text-red-500" />;
    case 'commented':
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'followed':
      return <UserPlus className="h-5 w-5 text-green-500" />;
    default:
      return null;
  }
};

export function NotificationsSheet() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const notificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: notifications, isLoading } = useCollection<AppNotification>(notificationsQuery);
  
  useEffect(() => {
    if (notifications && notifications.some(n => !n.isRead)) {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        const markAsRead = async () => {
             if (user && unreadIds.length > 0) {
                 // Debounce or delay this call to avoid marking as read immediately on open
                 setTimeout(() => {
                     markNotificationsAsRead(user.uid, unreadIds);
                 }, 3000); // 3-second delay
             }
        }
        markAsRead();
    }
  }, [notifications, user]);

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>الإشعارات</SheetTitle>
      </SheetHeader>
      <ScrollArea className="h-[calc(100%-4rem)] pr-4 -mr-6">
        <div className="py-4 space-y-2">
          {isLoading && (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}
          {!isLoading && notifications && notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  !notif.isRead ? "bg-primary/10" : "hover:bg-secondary"
                )}
              >
                {!notif.isRead && <span className="h-2 w-2 mt-2 rounded-full bg-primary" />}
                <div className="flex-shrink-0 relative">
                     <Link href={`/home/profile/${notif.fromUser.username}`}>
                        <Avatar>
                            <AvatarImage src={notif.fromUser.avatarUrl} alt={notif.fromUser.name} />
                            <AvatarFallback>{notif.fromUser.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                     </Link>
                     <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                        <NotificationIcon type={notif.type} />
                     </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                     <Link href={`/home/profile/${notif.fromUser.username}`} className="font-semibold hover:underline">{notif.fromUser.name}</Link>
                     {' '}{notif.content}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.createdAt))}</p>
                </div>
              </div>
            ))
          ) : (
            !isLoading && (
              <div className="flex flex-col items-center justify-center h-full pt-20 text-center text-muted-foreground">
                <BellOff className="h-12 w-12 mb-4" />
                <h3 className="font-semibold">لا توجد إشعارات بعد</h3>
                <p className="text-sm">ستظهر الإعجابات والتعليقات والمتابعات الجديدة هنا.</p>
              </div>
            )
          )}
        </div>
      </ScrollArea>
    </SheetContent>
  );
}
