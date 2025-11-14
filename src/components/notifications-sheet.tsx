
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { useUser, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { type AppNotification } from '@/lib/types';
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, cn, safeToDate } from '@/lib/utils';
import { Heart, MessageCircle, UserPlus, BellOff, Trash2, Loader2 } from 'lucide-react';
import { markNotificationsAsRead, deleteNotification } from '@/services/notification-service';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

const NotificationIcon = ({ type }: { type: AppNotification['type'] }) => {
  switch (type) {
    case 'like':
      return <Heart className="h-5 w-5 text-red-500" />;
    case 'comment':
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'follow':
      return <UserPlus className="h-5 w-5 text-green-500" />;
    default:
      return null;
  }
};

export function NotificationsSheet() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: notifications, isLoading, error } = useCollection<AppNotification>(notificationsQuery);
  
  useEffect(() => {
    if (notifications && notifications.some(n => !n.isRead)) {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        const markAsRead = async () => {
             if (user && unreadIds.length > 0) {
                 // Debounce or delay this call to avoid marking as read immediately on open
                 const timer = setTimeout(() => {
                     markNotificationsAsRead(user.uid, unreadIds);
                 }, 3000); // 3-second delay
                 return () => clearTimeout(timer);
             }
        }
        markAsRead();
    }
  }, [notifications, user]);

  const handleDelete = async (notificationId: string) => {
    if (!user) return;
    setDeletingId(notificationId);
    try {
        await deleteNotification(user.uid, notificationId);
    } catch (e) {
        console.error(e);
        toast({
            title: 'خطأ',
            description: 'فشل حذف الإشعار.',
            variant: 'destructive',
        });
    } finally {
        setDeletingId(null);
    }
  };

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
          {error && <p className="text-destructive text-center">حدث خطأ أثناء تحميل الإشعارات.</p>}
          {!isLoading && notifications && notifications.length > 0 ? (
            notifications.map((notif) => {
              const notifDate = safeToDate(notif.createdAt);
              return (
                <div
                    key={notif.id}
                    className={cn(
                        "group flex items-start gap-3 p-3 rounded-lg transition-colors",
                        !notif.isRead ? "bg-primary/10" : "hover:bg-secondary"
                    )}
                >
                    {!notif.isRead && <span className="h-2 w-2 mt-2 rounded-full bg-primary flex-shrink-0" />}
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
                    <p className="text-xs text-muted-foreground">
                        {notifDate ? formatDistanceToNow(notifDate) : "منذ لحظات"}
                    </p>
                    </div>
                    <div className="flex-shrink-0">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(notif.id)}
                            disabled={deletingId === notif.id}
                        >
                            {deletingId === notif.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                        </Button>
                    </div>
                </div>
              )
            })
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
