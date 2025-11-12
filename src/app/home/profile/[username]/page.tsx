
import Image from "next/image";
import Link from "next/link";
import { mockPosts, getUser } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Settings } from "lucide-react";

export default function ProfilePage({ params }: { params: { username: string } }) {
  const user = getUser(params.username);
  const userPosts = mockPosts.filter(p => p.author.username === user.username);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative h-48 w-full">
          <Image
            src={user.coverUrl}
            alt={`${user.name}'s cover photo`}
            data-ai-hint="user cover photo"
            fill
            className="object-cover"
          />
        </div>
        <CardContent className="p-4 relative">
          <div className="flex justify-between">
            <Avatar className="-mt-16 h-28 w-28 border-4 border-card">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <Button variant="outline" asChild>
                <Link href="/home/settings">
                    <Settings className="h-4 w-4 me-2" />
                    تعديل الملف الشخصي
                </Link>
            </Button>
          </div>
          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-bold font-headline">{user.name}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <p className="pt-2">{user.bio}</p>
          </div>
          <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
            <div>
              <span className="font-bold text-foreground">{user.followingCount}</span> Following
            </div>
            <div>
              <span className="font-bold text-foreground">{user.followerCount}</span> Followers
            </div>
             <div>
              <span className="font-bold text-foreground">{user.postCount}</span> Posts
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">المنشورات</TabsTrigger>
          <TabsTrigger value="replies">الردود</TabsTrigger>
          <TabsTrigger value="media">الوسائط</TabsTrigger>
          <TabsTrigger value="likes">الإعجابات</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="space-y-6 mt-6">
           {userPosts.length > 0 ? (
            userPosts.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    لم ينشر {user.name} أي شيء بعد.
                </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
