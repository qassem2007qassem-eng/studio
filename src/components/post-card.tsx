import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, MoreHorizontal, Share2, Flag } from "lucide-react";

import { type Post } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5">
            <Link href={`/home/profile/${post.author.username}`} className="font-semibold hover:underline">
              {post.author.name}
            </Link>
            <p className="text-xs text-muted-foreground">@{post.author.username} · {post.createdAt}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 me-auto ms-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Flag className="ms-2 h-4 w-4" />
                <span>إبلاغ عن المنشور</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <p className="whitespace-pre-wrap">{post.content}</p>
        {post.imageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
            <Image
              src={post.imageUrl}
              alt="Post image"
              data-ai-hint="post image"
              fill
              className="object-cover"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 p-4 pt-0">
         <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
          <p>{post.likeCount} إعجاب</p>
          <p>{post.commentCount} تعليق</p>
        </div>
        <Separator />
        <div className="grid w-full grid-cols-3 gap-2">
          <Button variant="ghost" className="gap-2">
            <Heart className={cn("h-5 w-5", post.isLiked && "fill-red-500 text-red-500")} />
            <span>أعجبني</span>
          </Button>
          <Button variant="ghost" className="gap-2">
            <MessageCircle className="h-5 w-5" />
            <span>تعليق</span>
          </Button>
          <Button variant="ghost" className="gap-2">
            <Share2 className="h-5 w-5" />
            <span>مشاركة</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
