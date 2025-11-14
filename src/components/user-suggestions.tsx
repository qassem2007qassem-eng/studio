
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { type User, type AppNotification } from '@/lib/types';
import { getUsers, followUser, unfollowUser, getCurrentUserProfile } from '@/services/user-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';

export function UserSuggestions() {
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const { firestore } = useFirebase();

  const followRequestsQuery = useMemoFirebase(() => {
    if (!currentUser) return null;
    return query(
      collection(firestore, `users/${currentUser.uid}/notifications`),
      where('type', '==', 'follow_request')
    );
  }, [currentUser, firestore]);

  const { data: requests } = useCollection<AppNotification>(followRequestsQuery);

  const fetchSuggestions = useCallback(async (profile: User) => {
    setIsLoading(true);
    
    const requesterIds = requests?.map(r => r.fromUser.id) || [];
    const followingIds = profile.following || [];
    // Make sure to exclude the current user from suggestions
    const excludeIds = [currentUser?.uid, ...followingIds, ...requesterIds].filter((id): id is string => !!id);

    // Fetch requesters' full profiles
    let requesters: User[] = [];
    if (requesterIds.length > 0) {
      const { users: requesterUsers } = await getUsers(requesterIds.length, null, requesterIds);
      requesters = requesterUsers;
    }

    // Fetch other random users
    const { users: randomUsers } = await getUsers(5, null, [], excludeIds);
    
    // Combine and slice
    const combinedSuggestions = [...requesters, ...randomUsers].filter(
      (user, index, self) => index === self.findIndex((u) => u.id === user.id) // Remove duplicates
    ).slice(0, 5);
    
    setSuggestions(combinedSuggestions);
    setIsLoading(false);
  }, [currentUser?.uid, requests]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (currentUser && !isCurrentUserLoading) {
        const profile = await getCurrentUserProfile({ forceRefresh: true });
        setCurrentUserProfile(profile);
        if (profile) {
          await fetchSuggestions(profile);
        } else {
            setIsLoading(false);
        }
      } else if (!isCurrentUserLoading) {
        // No user logged in
        setIsLoading(false);
        setSuggestions([]);
      }
    };
    fetchInitialData();
  }, [currentUser, isCurrentUserLoading, fetchSuggestions, requests]);


  const handleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    
    // Optimistic UI update
    setSuggestions(prev => prev.filter(u => u.id !== targetUserId));
    
    try {
      await followUser(targetUserId);
    } catch (error) {
      console.error("Failed to follow user", error);
      // Optional: Add the user back on error, though it might be better to just let them disappear.
    }
  };
  
  if (!currentUser) {
      return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-4 w-4/5" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/4" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't render the card if there are no suggestions
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>اقتراحات للمتابعة</CardTitle>
        <CardDescription>أشخاص قد تعرفهم.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map(user => (
          <div key={user.id} className="flex items-center gap-4">
            <Link href={`/home/profile/${user.username.toLowerCase()}`} className="flex items-center gap-4 flex-1">
              <Avatar className="h-10 w-10">
                <AvatarImage alt={user.name} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user.name}</p>
              </div>
            </Link>
            <Button 
                onClick={() => handleFollow(user.id)}
                size="sm"
            >
              <UserPlus className="h-4 w-4 me-2" /> متابعة
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
