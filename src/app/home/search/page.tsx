
"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockPosts, mockUsersToFollow } from '@/lib/data';
import { PostCard } from '@/components/post-card';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function SearchPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPosts = mockPosts.filter(p => p.content.includes(searchTerm));
    const filteredUsers = mockUsersToFollow.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-4">
                    <Input 
                        placeholder="ابحث عن منشورات، مستخدمين، أو هاشتاجات..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </CardContent>
            </Card>

            <Tabs defaultValue="posts" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="posts">المنشورات</TabsTrigger>
                    <TabsTrigger value="users">المستخدمون</TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="space-y-6 mt-6">
                    {filteredPosts.length > 0 ? (
                        filteredPosts.map(post => <PostCard key={post.id} post={post} />)
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                لا توجد منشورات تطابق بحثك.
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="users" className="space-y-4 mt-6">
                     {filteredUsers.length > 0 ? (
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                {filteredUsers.map((user) => (
                                    <div key={user.id} className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <Link href={`/home/profile/${user.username}`} className="font-semibold hover:underline">
                                        {user.name}
                                        </Link>
                                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                                    </div>
                                    <Button size="sm">Follow</Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                لا يوجد مستخدمون يطابقون بحثك.
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
