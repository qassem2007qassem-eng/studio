
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase';
import { type User } from '@/lib/types';
import { getUsers, followUser, unfollowUser, getCurrentUserProfile } from '@/services/user-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { type DocumentSnapshot } from 'firebase/firestore';

export default function FriendsPage() {
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowingMap, setIsFollowingMap] = useState<Record<string, boolean>>({});
  
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);

  const buildFollowingMap = useCallback((profile: User | null, userList: User[]) => {
    if (!profile) return {};
    const followingIds = new Set(profile.following || []);
    const map: Record<string, boolean> = {};
    userList.forEach(u => {
      map[u.id] = followingIds.has(u.id);
    });
    return map;
  }, []);

  const fetchInitialUsers = useCallback(async (profile: User) => {
    setIsLoading(true);
    const { users: initialUsers, lastVisible: newLastVisible, hasMore: newHasMore } = await getUsers(20);
    
    const filteredUsers = initialUsers.filter(u => u.id !== currentUser?.uid);
    setUsers(filteredUsers);
        
    setIsFollowingMap(buildFollowingMap(profile, filteredUsers));
    
    setLastVisible(newLastVisible);
    setHasMore(newHasMore);
    setIsLoading(false);
  }, [currentUser?.uid, buildFollowingMap]);

  useEffect(() => {
    const fetchCurrentUserAndUsers = async () => {
        if (currentUser) {
            const profile = await getCurrentUserProfile();
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

    const { users: newUsers, lastVisible: newLastVisible, hasMore: newHasMore } = await getUsers(20, lastVisible);
    
    const existingUserIds = new Set(users.map(u => u.id));
    const filteredNewUsers = newUsers.filter(u => u.id !== currentUser?.uid && !existingUserIds.has(u.id));
    
    const updatedUsers = [...users, ...filteredNewUsers];
    setUsers(updatedUsers);

    setIsFollowingMap(buildFollowingMap(currentUserProfile, updatedUsers));

    setLastVisible(newLastVisible);
    setHasMore(newHasMore);
    setIsLoadingMore(false);
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser || !currentUserProfile) return;
    
    const isCurrentlyFollowing = !!isFollowingMap[targetUserId];
    
    // Optimistic UI update
    setIsFollowingMap(prev => ({ ...prev, [targetUserId]: !isCurrentlyFollowing }));

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      // Re-fetch current user profile to get updated following list
      const profile = await getCurrentUserProfile();
      setCurrentUserProfile(profile);

      // Re-build the following map with the fresh profile data
      setIsFollowingMap(buildFollowingMap(profile, users));

    } catch (error) {
      console.error("Failed to toggle follow", error);
      // Revert on error
      setIsFollowingMap(prev => ({ ...prev, [targetUserId]: isCurrentlyFollowing }));
    }
  };

  return (
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
          users.map(user => (
            <div key={user.id} className="flex items-center gap-4">
              <Link href={`/home/profile/${user.username.toLowerCase()}`} className="flex items-center gap-4 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
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
                    variant={isFollowingMap[user.id] ? 'secondary' : 'default'}
                    size="sm"
                    className="w-28"
                >
                  {isFollowingMap[user.id] ? (
                    <><UserCheck className="h-4 w-4 me-2" /> متابَع</>
                  ) : (
                    <><UserPlus className="h-4 w-4 me-2" /> متابعة</>
                  )}
                </Button>
              )}
            </div>
          ))
        )}
        {!isLoading && users.length === 0 && <p className="text-center text-muted-foreground pt-4">لا يوجد مستخدمون لعرضهم.</p>}
      </CardContent>
      {hasMore && (
        <CardFooter>
            <Button onClick={handleLoadMore} disabled={isLoadingMore} className="w-full">
                {isLoadingMore ? <Loader2 className="animate-spin" /> : "تحميل المزيد"}
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}
