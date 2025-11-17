
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
  
  const fetchSuggestions = useCallback(async (profile: User | null) => {
    setIsLoading(true);
    
    // Only show suggestions to users who are not teachers
    if (currentUser?.email?.endsWith('@teacher.app.com')) {
      setIsLoading(false);
      setSuggestions([]);
      return;
    }
    
    // Suggest teachers if the user isn't following anyone
    if (profile && profile.following.length > 0) {
      setIsLoading(false);
      setSuggestions([]);
      return;
    }
    
    // Fetch teachers 
    const { users: teacherUsers } = await getUsers(5, null, [], [], true);
    
    // Exclude users already followed or the current user
    const followingIds = new Set(profile?.following || []);
    const filteredTeachers = teacherUsers.filter(
      (teacher) => teacher.id !== currentUser?.uid && !followingIds.has(teacher.id)
    );

    setSuggestions(filteredTeachers);
    setIsLoading(false);
  }, [currentUser?.uid, currentUser?.email]);

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
        setIsLoading(false);
        setSuggestions([]);
      }
    };
    fetchInitialData();
  }, [currentUser, isCurrentUserLoading, fetchSuggestions]);


  const handleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    
    // Optimistic UI update
    setSuggestions(prev => prev.filter(u => u.id !== targetUserId));
    
    try {
      await followUser(targetUserId);
    } catch (error) {
      console.error("Failed to follow user", error);
      // Optional: Add the user back on error
    }
  };
  
  if (!currentUser || currentUser.email?.endsWith('@teacher.app.com')) {
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
    // Only show this card if the user isn't following anyone
    if (currentUserProfile && currentUserProfile.following.length === 0) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>مرحباً بك!</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">صفحتك الرئيسية فارغة حالياً. ابدأ بمتابعة بعض الأشخاص أو استكشف المجموعات لترى منشوراتهم هنا.</p>
                 <Button asChild className="mt-4">
                    <Link href="/home/friends">
                        اكتشف الأصدقاء
                    </Link>
                </Button>
            </CardContent>
          </Card>
        );
    }
    return null; // Don't show anything if suggestions are empty but user is following people
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>اقتراحات للمتابعة</CardTitle>
        <CardDescription>ابدأ بمتابعة هؤلاء المعلمين لترى محتواهم التعليمي.</CardDescription>
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
                 <p className="text-xs text-muted-foreground">@{user.username.toLowerCase()}</p>
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
