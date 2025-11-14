
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, Loader2, UserPlus, UserCheck } from 'lucide-react';
import { useUser } from '@/firebase';
import { type User } from '@/lib/types';
import { getUsers, followUser, unfollowUser, getCurrentUserProfile } from '@/services/user-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent } from '@/components/ui/card';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useUser();
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
      const fetchProfile = async () => {
          if (currentUser) {
              const profile = await getCurrentUserProfile({ forceRefresh: true });
              setCurrentUserProfile(profile);
          }
      };
      fetchProfile();
  }, [currentUser]);

  const searchUsers = useCallback(async (term: string) => {
    if (term.trim() === '') {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    // In a real app, this would be a dedicated search endpoint.
    // For now, we fetch a batch of users and filter them client-side.
    // This is not efficient for large datasets.
    const { users } = await getUsers(50); 
    const lowercasedTerm = term.toLowerCase();
    
    const filteredUsers = users.filter(user => 
        user.id !== currentUser?.uid &&
        (user.name.toLowerCase().includes(lowercasedTerm) || 
         user.username.toLowerCase().includes(lowercasedTerm))
    ).slice(0, 15); // Limit results

    setResults(filteredUsers);
    setIsLoading(false);
  }, [currentUser?.uid]);

  useEffect(() => {
    setIsLoading(true);
    searchUsers(debouncedSearchTerm);
  }, [debouncedSearchTerm, searchUsers]);

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUserProfile) return;

    const isCurrentlyFollowing = currentUserProfile.following.includes(targetUserId);

    // Optimistic UI update
    const updatedFollowing = isCurrentlyFollowing
      ? currentUserProfile.following.filter(id => id !== targetUserId)
      : [...currentUserProfile.following, targetUserId];
    
    setCurrentUserProfile({ ...currentUserProfile, following: updatedFollowing });

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      // Refresh profile from server to ensure sync
      const freshProfile = await getCurrentUserProfile({ forceRefresh: true });
      setCurrentUserProfile(freshProfile);
    } catch (error) {
      console.error("Failed to toggle follow", error);
      // Revert optimistic update on error
      const revertedFollowing = isCurrentlyFollowing
        ? [...currentUserProfile.following, targetUserId]
        : currentUserProfile.following.filter(id => id !== targetUserId);
      setCurrentUserProfile({ ...currentUserProfile, following: revertedFollowing });
    }
  };

  const isFollowing = (userId: string) => {
      return currentUserProfile?.following?.includes(userId) ?? false;
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="ابحث عن مستخدمين..."
          className="w-full pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-4">
        {isLoading && (
            [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-10 w-24 rounded-md" />
                </div>
            ))
        )}

        {!isLoading && debouncedSearchTerm && results.length === 0 && (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    <p>لم يتم العثور على مستخدمين باسم "{debouncedSearchTerm}"</p>
                </CardContent>
            </Card>
        )}

        {!isLoading && results.length > 0 && (
             <Card>
                <CardContent className="p-4 space-y-4">
                    {results.map(user => (
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
                        {currentUser && currentUser.uid !== user.id && currentUserProfile && (
                        <Button 
                            onClick={() => handleFollowToggle(user.id)}
                            variant={isFollowing(user.id) ? 'secondary' : 'default'}
                            size="sm"
                            className="w-28"
                        >
                            {isFollowing(user.id) ? (
                            <><UserCheck className="h-4 w-4 me-2" /> متابَع</>
                            ) : (
                            <><UserPlus className="h-4 w-4 me-2" /> متابعة</>
                            )}
                        </Button>
                        )}
                    </div>
                    ))}
                </CardContent>
             </Card>
        )}

         {!isLoading && !debouncedSearchTerm && (
            <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                     <SearchIcon className="h-10 w-10 mx-auto mb-4" />
                    <p>اكتب في الشريط أعلاه للبحث عن أصدقاء ومستخدمين آخرين.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
