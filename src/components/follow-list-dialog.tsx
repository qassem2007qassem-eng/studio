
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { type User } from '@/lib/types';
import { getUsersByIds, followUser, unfollowUser, getCurrentUserProfile } from '@/services/user-service';
import { useUser } from '@/firebase';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface FollowListDialogProps {
  title: string;
  userIds: string[];
  trigger: React.ReactNode;
  onFollowStateChange: () => void;
}

export function FollowListDialog({ title, userIds, trigger, onFollowStateChange }: FollowListDialogProps) {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    if (userIds.length > 0 && isOpen) {
      setIsLoading(true);
      const fetchedUsers = await getUsersByIds(userIds);
      setUsers(fetchedUsers);
      setIsLoading(false);
    } else {
      setUsers([]);
    }
  }, [userIds, isOpen]);
  
  const fetchCurrentUserProfile = useCallback(async () => {
    const profile = await getCurrentUserProfile({ forceRefresh: true });
    setCurrentUserProfile(profile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentUserProfile();
      fetchUsers();
    }
  }, [isOpen, fetchUsers, fetchCurrentUserProfile]);

  const followingMap = useMemo(() => {
    if (!currentUserProfile) return {};
    return new Set(currentUserProfile.following || []);
  }, [currentUserProfile]);

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser) return;
    
    const isCurrentlyFollowing = followingMap.has(targetUserId);

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
        toast({ title: "تم إلغاء المتابعة" });
      } else {
        await followUser(targetUserId);
        toast({ title: "تمت المتابعة" });
      }
      // Refresh both current user profile and the list
      await fetchCurrentUserProfile();
      onFollowStateChange();
    } catch (error) {
      console.error("Failed to toggle follow", error);
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-72">
          <div className="space-y-4 pr-6">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              ))
            ) : users.length > 0 ? (
              users.map(user => {
                const isFollowing = followingMap.has(user.id);
                return (
                  <div key={user.id} className="flex items-center gap-4">
                    <Link href={`/home/profile/${user.username.toLowerCase()}`} className="flex items-center gap-4 flex-1" onClick={() => setIsOpen(false)}>
                      <Avatar className="h-10 w-10">
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
                        variant={isFollowing ? 'secondary' : 'default'}
                        size="sm"
                        className="w-28"
                      >
                        {isFollowing ? (
                          <><UserCheck className="h-4 w-4 me-2" /> متابَع</>
                        ) : (
                          <><UserPlus className="h-4 w-4 me-2" /> متابعة</>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-center text-muted-foreground pt-10">لا يوجد مستخدمون لعرضهم.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
