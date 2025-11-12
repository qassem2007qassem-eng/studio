
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, MoreHorizontal, Share2, Flag } from "lucide-react";
import { useState } from "react";

import { type Post, type Comment } from "@/lib/types";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { getCurrentUser } from "@/lib/data";


interface PostCardProps {
  post: Post;
}

const CommentsDialog = ({ post, comments, setComments }: { post: Post, comments: Comment[], setComments: React.Dispatch<React.SetStateAction<Comment[]>> }) => {
    const [newComment, setNewComment] = useState("");
    const currentUser = getCurrentUser();

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            const addedComment: Comment = {
                id: `comment-${Date.now()}`,
                author: {
                    name: currentUser.name,
                    username: currentUser.username,
                    avatarUrl: currentUser.avatarUrl,
                },
                content: newComment.trim(),
                createdAt: "الآن",
            };
            setComments(prev => [addedComment, ...prev]);
            setNewComment("");
        }
    };

    return (
    <DialogContent className="sm:max-w-[525px]">
      <DialogHeader>
        <DialogTitle>تعليقات على منشور {post.author.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <ScrollArea className="h-72 w-full pr-4">
            <div className="space-y-4">
                {comments.length > 0 ? comments.map(comment => (
                    <div key={comment.id} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
                            <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="bg-muted p-3 rounded-lg">
                                <Link href={`/home/profile/${comment.author.username}`} className="font-semibold text-sm hover:underline">
                                    {comment.author.name}
                                </Link>
                                <p className="text-sm">{comment.content}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{comment.createdAt}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-muted-foreground">لا توجد تعليقات بعد. كن أول من يعلق!</p>
                )}
            </div>
        </ScrollArea>
        <Separator />
        <form onSubmit={handleAddComment} className="flex gap-2">
            <Input 
                placeholder="اكتب تعليقاً..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
            />
            <Button type="submit">نشر</Button>
        </form>
      </div>
    </DialogContent>
    )
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState(post.comments);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <Dialog>
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
            <p>{likeCount} إعجاب</p>
            <p>{comments.length} تعليق</p>
            </div>
            <Separator />
            <div className="grid w-full grid-cols-3 gap-2">
            <Button variant="ghost" className="gap-2" onClick={handleLike}>
                <Heart className={cn("h-5 w-5", isLiked && "fill-red-500 text-red-500")} />
                <span>أعجبني</span>
            </Button>
            <DialogTrigger asChild>
                <Button variant="ghost" className="gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <span>تعليق</span>
                </Button>
            </DialogTrigger>
            <Button variant="ghost" className="gap-2">
                <Share2 className="h-5 w-5" />
                <span>مشاركة</span>
            </Button>
            </div>
        </CardFooter>
        </Card>
        <CommentsDialog post={post} comments={comments} setComments={setComments} />
    </Dialog>
  );
}
