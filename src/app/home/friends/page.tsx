
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { type User } from '@/lib/types';
import { getAllUsers, followUser, unfollowUser } from '@/services/user-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function FriendsPage() {
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const allUsers = await getAllUsers();
      if (currentUser) {
        const filteredUsers = allUsers.filter(u => u.id !== currentUser.uid);
        setUsers(filteredUsers);
        
        // Pre-compute following status
        const followingIds = currentUser.following || [];
        const map: Record<string, boolean> = {};
        allUsers.forEach(u => {
          map[u.id] = followingIds.includes(u.id);
        });
        setFollowingMap(map);

      } else {
        setUsers(allUsers);
      }
      setIsLoading(false);
    };

    if (!isCurrentUserLoading) {
        fetchUsers();
    }
  }, [currentUser, isCurrentUserLoading]);

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser) return;
    
    setFollowingMap(prev => ({ ...prev, [targetUserId]: !prev[targetUserId] }));

    try {
      if (followingMap[targetUserId]) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
    } catch (error) {
      console.error("Failed to toggle follow", error);
      // Revert on error
      setFollowingMap(prev => ({ ...prev, [targetUserId]: !prev[targetUserId] }));
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
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">@{user.username.toLowerCase()}</p>
                </div>
              </Link>
              {currentUser && (
                <Button 
                    onClick={() => handleFollowToggle(user.id)}
                    variant={followingMap[user.id] ? 'secondary' : 'default'}
                    size="sm"
                    className="w-28"
                >
                  {followingMap[user.id] ? (
                    <><UserCheck className="h-4 w-4 me-2" /> متابَع</>
                  ) : (
                    <><UserPlus className="h-4 w-4 me-2" /> متابعة</>
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
