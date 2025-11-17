
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { type User, type AppNotification } from '@/lib/types';
import { getUsers, followUser, unfollowUser, getCurrentUserProfile, respondToFollowRequest } from '@/services/user-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { UserPlus, UserCheck, Check, X } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { type DocumentSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

function FollowRequests() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const followRequestsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      where('type', '==', 'follow_request')
    );
  }, [user, firestore]);

  const { data: requests, isLoading } = useCollection<AppNotification>(followRequestsQuery);

  const handleFollowRequest = async (notification: AppNotification, action: 'accept' | 'decline') => {
      setRespondingId(notification.id);
      try {
        await respondToFollowRequest(notification.id, notification.fromUser.id, action);
        toast({
            title: action === 'accept' ? 'تم قبول الطلب' : 'تم رفض الطلب',
        });
      } catch (e) {
          console.error("Failed to respond to follow request", e);
          toast({ title: 'خطأ', description: 'فشل الرد على طلب المتابعة.', variant: 'destructive' });
      } finally {
          setRespondingId(null);
      }
  };
  
  if (isLoading || !requests || requests.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 bg-secondary">
      <CardHeader>
        <CardTitle className="text-lg">طلبات المتابعة</CardTitle>
        <CardDescription>هؤلاء المستخدمون يريدون متابعتك.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map(req => (
          <div key={req.id} className="flex items-center gap-4">
             <Link href={`/home/profile/${req.fromUser.username.toLowerCase()}`} className="flex items-center gap-4 flex-1">
                <Avatar className="h-10 w-10">
                    <AvatarImage alt={req.fromUser.name} />
                    <AvatarFallback>{req.fromUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{req.fromUser.name}</p>
                    <p className="text-sm text-muted-foreground">@{req.fromUser.username.toLowerCase()}</p>
                </div>
            </Link>
             <div className="flex gap-2">
                <Button size="sm" onClick={() => handleFollowRequest(req, 'accept')} disabled={respondingId === req.id}>
                    {respondingId === req.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <Check className="h-4 w-4"/>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleFollowRequest(req, 'decline')} disabled={respondingId === req.id}>
                     {respondingId === req.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <X className="h-4 w-4"/>}
                </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function FriendsPage() {
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  
  const [followingMap, setFollowingMap] = useState<Record<string, {isFollowing: boolean; isLoading: boolean}>>({});

  const buildFollowingMap = useCallback((profile: User | null, userList: User[]) => {
    if (!profile) return {};
    const followingIds = new Set(profile.following || []);
    const map: Record<string, {isFollowing: boolean; isLoading: boolean}> = {};
    userList.forEach(u => {
      map[u.id] = {isFollowing: followingIds.has(u.id), isLoading: false};
    });
    return map;
  }, []);

  const fetchInitialUsers = useCallback(async (profile: User) => {
    setIsLoading(true);
    const { users: initialUsers, lastVisible: newLastVisible, hasMore: newHasMore } = await getUsers(10);
    
    const filteredUsers = initialUsers.filter(u => u.id !== currentUser?.uid);
    setUsers(filteredUsers);
        
    setFollowingMap(buildFollowingMap(profile, filteredUsers));
    
    setLastVisible(newLastVisible);
    setHasMore(newHasMore);
    setIsLoading(false);
  }, [currentUser?.uid, buildFollowingMap]);

  useEffect(() => {
    const fetchCurrentUserAndUsers = async () => {
        if (currentUser) {
            const profile = await getCurrentUserProfile({ forceRefresh: true });
            setCurrentUserProfile(profile);
            if(profile) {
              await fetchInitialUsers(profile);
            } else {
              setIsLoading(false);
            }
        } else {
          setIsLoading(false);
          setUsers([]);
        }
    }
    if (!isCurrentUserLoading) {
        fetchCurrentUserAndUsers();
    }
  }, [currentUser, isCurrentUserLoading, fetchInitialUsers]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || !currentUserProfile) return;
    setIsLoadingMore(true);

    const { users: newUsers, lastVisible: newLastVisible, hasMore: newHasMore } = await getUsers(10, lastVisible);
    
    const existingUserIds = new Set(users.map(u => u.id));
    const filteredNewUsers = newUsers.filter(u => u.id !== currentUser?.uid && !existingUserIds.has(u.id));
    
    const updatedUsers = [...users, ...filteredNewUsers];
    setUsers(updatedUsers);

    setFollowingMap(prev => ({...prev, ...buildFollowingMap(currentUserProfile, filteredNewUsers)}));

    setLastVisible(newLastVisible);
    setHasMore(newHasMore);
    setIsLoadingMore(false);
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser) return;
    
    const isCurrentlyFollowing = !!followingMap[targetUserId]?.isFollowing;
    
    setFollowingMap(prev => ({ ...prev, [targetUserId]: { ...prev[targetUserId], isLoading: true } }));

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      const freshProfile = await getCurrentUserProfile({ forceRefresh: true });
      setCurrentUserProfile(freshProfile);
      if (freshProfile) {
        setFollowingMap(prev => ({ ...prev, [targetUserId]: { isFollowing: freshProfile.following.includes(targetUserId), isLoading: false }}));
      }

    } catch (error) {
      console.error("Failed to toggle follow", error);
      setFollowingMap(prev => ({ ...prev, [targetUserId]: { isFollowing: isCurrentlyFollowing, isLoading: false } }));
    }
  };

  return (
    <>
      <FollowRequests />
      <Card>
        <CardHeader>
          <CardTitle>اكتشف الأصدقاء</CardTitle>
          <CardDescription>ابحث عن مستخدمين آخرين لمتابعتهم.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-10 w-24 rounded-md" />
              </div>
            ))
          ) : (
            users.map(user => {
              const followState = followingMap[user.id] || { isLoading: false, isFollowing: false };
              return (
              <div key={user.id} className="flex items-center gap-4">
                <Link href={`/home/profile/${user.username.toLowerCase()}`} className="flex items-center gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username.toLowerCase()}</p>
                  </div>
                </Link>
                {currentUser && currentUser.uid !== user.id && (
                  <Button 
                      onClick={() => handleFollowToggle(user.id)}
                      variant={followState.isFollowing ? 'secondary' : 'default'}
                      size="sm"
                      className="w-28"
                      disabled={followState.isLoading}
                  >
                    {followState.isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : (
                        followState.isFollowing ? (
                        <><UserCheck className="h-4 w-4 me-2" /> متابَع</>
                        ) : (
                        <><UserPlus className="h-4 w-4 me-2" /> متابعة</>
                        )
                    )}
                  </Button>
                )}
              </div>
            )})
          )}
          {!isLoading && users.length === 0 && <p className="text-center text-muted-foreground pt-4">لا يوجد مستخدمون لعرضهم.</p>}
        </CardContent>
        {hasMore && (
          <CardFooter>
              <Button onClick={handleLoadMore} disabled={isLoadingMore} className="w-full">
                  {isLoadingMore ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : "تحميل المزيد"}
              </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
