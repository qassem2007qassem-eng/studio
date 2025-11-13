
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/post-card';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, orderBy, startAt, endAt, onSnapshot, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { type Post, type User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const UserSearchResult = ({ user: profileUser, currentUser, firestore }: { user: User, currentUser: any, firestore: any }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(true);
    const [followDocId, setFollowDocId] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser || !firestore || currentUser.uid === profileUser.id) {
            setIsFollowLoading(false);
            return;
        }
        const followsRef = collection(firestore, 'follows');
        const q = query(followsRef, where('followerId', '==', currentUser.uid), where('followeeId', '==', profileUser.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setIsFollowing(true);
                setFollowDocId(snapshot.docs[0].id);
            } else {
                setIsFollowing(false);
                setFollowDocId(null);
            }
            setIsFollowLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser, firestore, profileUser.id]);
    
    const handleFollowToggle = async () => {
        if (!currentUser || !profileUser || isFollowLoading || currentUser.uid === profileUser.id || !firestore) return;
    
        setIsFollowLoading(true);
        
        const currentUserRef = doc(firestore, 'users', currentUser.uid);
        const profileUserRef = doc(firestore, 'users', profileUser.id);
        const batch = writeBatch(firestore);
    
        if (isFollowing && followDocId) {
          const followRef = doc(firestore, 'follows', followDocId);
          batch.delete(followRef);
          batch.update(currentUserRef, { followingCount: increment(-1) });
          batch.update(profileUserRef, { followerCount: increment(-1) });
    
        } else {
          const newFollowRef = doc(collection(firestore, 'follows'));
          batch.set(newFollowRef, {
            followerId: currentUser.uid,
            followeeId: profileUser.id,
            createdAt: serverTimestamp()
          });
          batch.update(currentUserRef, { followingCount: increment(1) });
          batch.update(profileUserRef, { followerCount: increment(1) });
        }
    
        try {
            await batch.commit();
        } catch(error) {
            console.error("Failed to toggle follow", error);
        } finally {
            setIsFollowLoading(false);
        }
      };


    if (profileUser.id === currentUser?.uid) return null;

    return (
        <div key={profileUser.id} className="flex items-center gap-3">
            <Avatar>
                <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
                <AvatarFallback>{profileUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <Link href={`/home/profile/${profileUser.username.toLowerCase()}`} className="font-semibold hover:underline">
                    {profileUser.name}
                </Link>
                <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
            </div>
            <Button size="sm" onClick={handleFollowToggle} disabled={isFollowLoading} variant={isFollowing ? 'secondary' : 'default'}>
                {isFollowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isFollowing ? "إلغاء المتابعة" : "متابعة")}
            </Button>
        </div>
    )
}

export default function SearchPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState("posts");
    const [results, setResults] = useState<{ posts: Post[], users: User[] }>({ posts: [], users: [] });
    const [isLoading, setIsLoading] = useState(false);
    const firestore = useFirestore();
    const { user: currentUser } = useUser();

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (!debouncedSearchTerm.trim() || !firestore) {
            setResults({ posts: [], users: [] });
            return;
        }

        const performSearch = async () => {
            setIsLoading(true);
            try {
                // Search Users
                const usersRef = collection(firestore, 'users');
                const userQuery = query(usersRef,
                    where('username', '>=', debouncedSearchTerm.toLowerCase()),
                    where('username', '<=', debouncedSearchTerm.toLowerCase() + '\uf8ff')
                );
                const userSnapshot = await getDocs(userQuery);
                const users = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

                // Search Posts
                const postsRef = collection(firestore, 'posts');
                const postQuery = query(postsRef,
                    orderBy('content'),
                    startAt(debouncedSearchTerm),
                    endAt(debouncedSearchTerm + '\uf8ff')
                );
                const postSnapshot = await getDocs(postQuery);
                const posts = postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

                setResults({ users, posts });

            } catch (error) {
                console.error("Error searching:", error);
                setResults({ posts: [], users: [] });
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();

    }, [debouncedSearchTerm, firestore]);

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-4">
                    <Input
                        placeholder="ابحث عن منشورات، مستخدمين..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="posts">المنشورات</TabsTrigger>
                    <TabsTrigger value="users">المستخدمون</TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="space-y-6 mt-6">
                    {isLoading ? <Skeleton className="h-32 w-full" /> :
                     results.posts.length > 0 ? (
                        results.posts.map(post => <PostCard key={post.id} post={post} />)
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                {debouncedSearchTerm ? 'لا توجد منشورات تطابق بحثك.' : 'ابدا البحث عن منشورات.'}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="users" className="space-y-4 mt-6">
                     {isLoading ? <Skeleton className="h-32 w-full" /> :
                      results.users.length > 0 ? (
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                {results.users.map((user: User) => (
                                    <UserSearchResult key={user.id} user={user} currentUser={currentUser} firestore={firestore}/>
                                ))}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                {debouncedSearchTerm ? 'لا يوجد مستخدمون يطابقون بحثك.' : 'ابدا البحث عن مستخدمين.'}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
