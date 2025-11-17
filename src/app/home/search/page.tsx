

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, UserPlus, UserCheck, Users, Newspaper, GraduationCap } from 'lucide-react';
import { useUser } from '@/firebase';
import { type User, type Group, type Post } from '@/lib/types';
import { followUser, unfollowUser, getCurrentUserProfile, getUsers } from '@/services/user-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, query, where, getDocs, limit, or } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { PostCard } from '@/components/post-card';

function UserSearchResults({ users, onFollowToggle, isFollowing, currentUser }: { users: User[], onFollowToggle: (id: string) => void, isFollowing: (id: string) => boolean, currentUser: any }) {
    if (users.length === 0) {
        return <p className="text-center text-muted-foreground pt-10">لا يوجد مستخدمون مطابقون.</p>
    }
    return (
        <div className="space-y-4">
            {users.map(user => (
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
                    onClick={() => onFollowToggle(user.id)}
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
        </div>
    );
}

function GroupSearchResults({ groups }: { groups: Group[] }) {
    if (groups.length === 0) {
        return <p className="text-center text-muted-foreground pt-10">لا توجد مجموعات مطابقة.</p>
    }
    return (
        <div className="space-y-4">
            {groups.map(group => (
                 <Card key={group.id}>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 border">
                                <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <CardTitle className="text-lg hover:underline">
                                    <Link href={`/home/groups/${group.id}`}>{group.name}</Link>
                                </CardTitle>
                                <CardDescription className="truncate">{group.description}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>{group.privacy === 'public' ? 'مجموعة عامة' : 'مجموعة خاصة'}</span>
                        <span>{group.memberIds.length} أعضاء</span>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

function PostSearchResults({ posts }: { posts: Post[] }) {
     if (posts.length === 0) {
        return <p className="text-center text-muted-foreground pt-10">لا توجد منشورات مطابقة.</p>
    }
    return (
        <div className="space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
    );
}


export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const [userResults, setUserResults] = useState<User[]>([]);
  const [teacherResults, setTeacherResults] = useState<User[]>([]);
  const [groupResults, setGroupResults] = useState<Group[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useUser();
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const { firestore } = initializeFirebase();

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
      const fetchProfile = async () => {
          if (currentUser) {
              const profile = await getCurrentUserProfile({ forceRefresh: true });
              setCurrentUserProfile(profile);
          }
      };
      fetchProfile();
  }, [currentUser]);

  const searchAll = useCallback(async (term: string) => {
    if (term.trim() === '') {
      setUserResults([]);
      setTeacherResults([]);
      setGroupResults([]);
      setPostResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const lowercasedTerm = term.toLowerCase();
    
    try {
        // Search Users (students and teachers)
        const usersRef = collection(firestore, "users");
        const usersQuery = query(usersRef, where('username', '>=', lowercasedTerm), where('username', '<=', lowercasedTerm + '\uf8ff'), limit(15));
        const usersSnap = await getDocs(usersQuery);
        const fetchedUsers = usersSnap.docs.map(doc => doc.data() as User).filter(user => user.id !== currentUser?.uid);
        
        const students = fetchedUsers.filter(u => u.accountType === 'student');
        const teachers = fetchedUsers.filter(u => u.accountType === 'teacher');
        
        setUserResults(students);
        setTeacherResults(teachers);

        // Search Groups
        const groupsRef = collection(firestore, "groups");
        const groupsQuery = query(groupsRef, where('name', '>=', term), where('name', '<=', term + '\uf8ff'), where('privacy', '==', 'public'), limit(15));
        const groupsSnap = await getDocs(groupsQuery);
        setGroupResults(groupsSnap.docs.map(doc => doc.data() as Group));

        // Search Posts (simple content search on public posts)
        const postsRef = collection(firestore, "posts");
        // Simplified query to only search content field.
        const postsQuery = query(postsRef, where('content', '>=', lowercasedTerm), where('content', '<=', lowercasedTerm + '\uf8ff'), limit(15));
        const postsSnap = await getDocs(postsQuery);
        // Filter for public posts on the client-side
        const publicPosts = postsSnap.docs
            .map(doc => doc.data() as Post)
            .filter(post => post.privacy === 'followers' && !post.groupId); // 'followers' is used as 'public'
        setPostResults(publicPosts);
        
    } catch(e) {
        console.error("Search failed:", e);
    } finally {
        setIsLoading(false);
    }
  }, [currentUser?.uid, firestore]);

  useEffect(() => {
    searchAll(debouncedSearchTerm);
  }, [debouncedSearchTerm, searchAll]);

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUserProfile) return;

    const isCurrentlyFollowing = currentUserProfile.following.includes(targetUserId);

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
      const freshProfile = await getCurrentUserProfile({ forceRefresh: true });
      setCurrentUserProfile(freshProfile);
    } catch (error) {
      console.error("Failed to toggle follow", error);
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
          placeholder="ابحث عن طلاب، معلمين، أو منشورات..."
          className="w-full pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>

       {!debouncedSearchTerm ? (
            <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                     <SearchIcon className="h-10 w-10 mx-auto mb-4" />
                    <p>اكتب في الشريط أعلاه للبحث في مجمع الطلاب.</p>
                </CardContent>
            </Card>
       ) : isLoading ? (
            <Card>
                <CardContent className="p-4">
                     <div key="users-skeleton" className="flex items-center gap-4 p-2">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-1/3" />
                        </div>
                    </div>
                </CardContent>
            </Card>
       ) : (
            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="users"><Users className="me-2"/> الطلاب</TabsTrigger>
                    <TabsTrigger value="teachers"><GraduationCap className="me-2"/> المعلمون</TabsTrigger>
                    <TabsTrigger value="posts"><Newspaper className="me-2"/> المنشورات</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="mt-6">
                    <Card>
                       <CardContent className="p-4">
                           <UserSearchResults users={userResults} onFollowToggle={handleFollowToggle} isFollowing={isFollowing} currentUser={currentUser} />
                       </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="teachers" className="mt-6">
                    <Card>
                       <CardContent className="p-4">
                           <UserSearchResults users={teacherResults} onFollowToggle={handleFollowToggle} isFollowing={isFollowing} currentUser={currentUser} />
                       </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="posts" className="mt-6">
                     <Card>
                       <CardContent className="p-4">
                          <PostSearchResults posts={postResults} />
                       </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
       )}
    </div>
  );
}
