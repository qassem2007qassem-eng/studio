'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { type User } from '@/lib/types';
import { useUser } from '@/firebase';
import { UserPlus, UserCheck, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { followUser, unfollowUser, getCurrentUserProfile } from '@/services/user-service';

interface TeacherInfoDialogProps {
  teacher: User;
  children: React.ReactNode;
  onFollowStateChange?: () => void;
}

export function TeacherInfoDialog({ teacher, children, onFollowStateChange }: TeacherInfoDialogProps) {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(true);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);


  const checkFollowStatus = useCallback(async () => {
    if (!currentUser || !teacher || !isOpen) {
      setIsFollowStatusLoading(false);
      return;
    }
    setIsFollowStatusLoading(true);
    const userProfile = await getCurrentUserProfile({ forceRefresh: true });
    setIsFollowing(userProfile?.following?.includes(teacher.id) || false);
    setIsFollowStatusLoading(false);
  }, [currentUser, teacher, isOpen]);

  useEffect(() => {
    if (isOpen) {
      checkFollowStatus();
    }
  }, [isOpen, checkFollowStatus]);


  const handleFollowToggle = async () => {
    if (!currentUser || !teacher || isTogglingFollow) return;

    setIsTogglingFollow(true);
    
    try {
      if (isFollowing) {
        await unfollowUser(teacher.id);
        setIsFollowing(false);
        toast({ title: `تم إلغاء متابعة ${teacher.name}`});
      } else {
        await followUser(teacher.id);
        setIsFollowing(true);
        toast({ title: `أنت تتابع الآن ${teacher.name}`});
      }
       await getCurrentUserProfile({ forceRefresh: true }); 
       onFollowStateChange?.();
    } catch (e) {
      console.error("Error toggling follow:", e);
      toast({ title: "حدث خطأ", description: "لم نتمكن من إتمام العملية. حاول مرة أخرى.", variant: "destructive" });
      await checkFollowStatus();
    } finally {
      setIsTogglingFollow(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader className="text-center items-center">
            <Avatar className="h-24 w-24 border-4 mb-4">
                <AvatarImage src={(teacher as any).avatarUrl} alt={teacher.name} />
                <AvatarFallback className="text-4xl">{teacher.name.charAt(0)}</AvatarFallback>
            </Avatar>
          <DialogTitle className="text-2xl">{teacher.name}</DialogTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary"/>
            <span>معلم</span>
             <span>·</span>
            <span>@{teacher.username.toLowerCase()}</span>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-4">
          <Button asChild>
            <Link href={`/home/profile/${teacher.username.toLowerCase()}`} onClick={() => setIsOpen(false)}>
              عرض الملف الشخصي
            </Link>
          </Button>
          {currentUser && currentUser.uid !== teacher.id && (
             <Button
                onClick={handleFollowToggle}
                variant={isFollowing ? 'secondary' : 'default'}
                disabled={isTogglingFollow || isFollowStatusLoading}
            >
                {isFollowStatusLoading || isTogglingFollow ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : (
                    isFollowing ? (
                    <><UserCheck className="h-4 w-4 me-2" /> متابَع</>
                    ) : (
                    <><UserPlus className="h-4 w-4 me-2" /> متابعة</>
                    )
                )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
