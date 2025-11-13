
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
import { collection, query, where, getDocs, orderBy, startAt, endAt, or, and } from 'firebase/firestore';
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

const UserSearchResult = ({ user, currentUser, firestore }: { user: User, currentUser: any, firestore: any }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || !firestore) {
            setIsLoading(false);
            return;
        };
        const followsRef = collection(firestore, 'follows');
        const q = query(followsRef, where('followerId', '==', currentUser.uid), where('followeeId', '==', user.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setIsFollowing(!snapshot.empty);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser, firestore, user.id]);

    const handleFollow = async () => {
        // Implement follow/unfollow logic here, similar to profile page
    }

    if (user.id === currentUser?.uid) return null;

    return (
        <div key={user.id} className="flex items-center gap-3">
            <Avatar>
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <Link href={`/home/profile/${user.username.toLowerCase()}`} className="font-semibold hover:underline">
                    {user.name}
                </Link>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
            <Button size="sm" onClick={handleFollow} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isFollowing ? "Unfollow" : "Follow")}
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
                    or(
                      and(where('username', '>=', debouncedSearchTerm.toLowerCase()), where('username', '<=', debouncedSearchTerm.toLowerCase() + '\uf8ff')),
                      and(where('name', '>=', debouncedSearchTerm), where('name', '<=', debouncedSearchTerm + '\uf8ff'))
                    )
                );
                const userSnapshot = await getDocs(userQuery);
                const users = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

                // Search Posts
                const postsRef = collection(firestore, 'posts');
                // Firestore doesn't support full-text search on content out of the box.
                // This is a very basic "starts with" search. A real app would use a third-party service like Algolia.
                const postQuery = query(postsRef,
                    where('content', '>=', debouncedSearchTerm),
                    where('content', '<=', debouncedSearchTerm + '\uf8ff'),
                    orderBy('content'),
                    orderBy("createdAt", "desc")
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
