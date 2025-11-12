
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RightSidebar() {
    // These will be implemented later with real data
    const mockTrends: any[] = [];
    const mockUsersToFollow: any[] = [];

    if (mockTrends.length === 0 && mockUsersToFollow.length === 0) {
        return (
            <div className="sticky top-24 space-y-6">
                <Card>
                     <CardHeader>
                        <CardTitle>ميزات قادمة</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            سيتم قريباً عرض الترندات والمستخدمين المقترحين للمتابعة هنا.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

  return (
    <div className="sticky top-24 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trends for you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockTrends.map((trend) => (
            <div key={trend.name}>
              <Link href="#" className="font-semibold hover:underline">
                {trend.name}
              </Link>
              <p className="text-sm text-muted-foreground">{trend.posts} posts</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Who to follow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockUsersToFollow.map((user) => (
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
    </div>
  );
}

    