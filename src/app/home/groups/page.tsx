
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PlusCircle, Users } from 'lucide-react';
import { type Group } from '@/lib/types';
import { useUser, initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, or } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function GroupsPage() {
    const { user } = useUser();
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { firestore } = initializeFirebase();

    useEffect(() => {
        const fetchGroups = async () => {
            setIsLoading(true);
            if (!firestore) return;

            const groupsRef = collection(firestore, 'groups');
            // Query for public groups OR groups where the user is a member.
            const q = user 
              ? query(groupsRef, or(where('privacy', '==', 'public'), where('memberIds', 'array-contains', user.uid)))
              : query(groupsRef, where('privacy', '==', 'public'));
            
            try {
                const querySnapshot = await getDocs(q);
                const fetchedGroups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
                setGroups(fetchedGroups);
            } catch (error) {
                console.error("Error fetching groups:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGroups();
    }, [user, firestore]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-headline">المجموعات</h1>
                <Button asChild>
                    <Link href="/home/groups/create">
                        <PlusCircle className="me-2" />
                        إنشاء مجموعة
                    </Link>
                </Button>
            </div>

            {isLoading ? (
                 <div className="grid grid-cols-1 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                     <Skeleton className="h-16 w-16 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-20" />
                            </CardFooter>
                        </Card>
                    ))}
                 </div>
            ) : groups.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">لا توجد مجموعات حتى الآن</h3>
                        <p className="text-muted-foreground">كن أول من ينشئ مجموعة!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {groups.map((group) => (
                        <Card key={group.id}>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                     <Avatar className="h-16 w-16 border">
                                        <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <CardTitle className="text-xl hover:underline">
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
            )}
        </div>
    );
}
