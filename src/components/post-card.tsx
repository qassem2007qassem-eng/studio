
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, MoreHorizontal, Share2, Flag } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

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
import { useFirebase, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { arrayRemove, arrayUnion, collection, doc, increment, orderBy, query } from "firebase/firestore";


interface PostCardProps {
  post: Post;
}

const CommentsDialog = ({ post }: { post: Post }) => {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [newComment, setNewComment] = useState("");

    const commentsCollection = useMemoFirebase(() => {
        if (!post || !firestore) return null;
        return collection(firestore, 'posts', post.id, 'comments');
    }, [firestore, post]);

    const commentsQuery = useMemoFirebase(() => {
        if (!commentsCollection) return null;
        return query(commentsCollection, orderBy('createdAt', 'desc'));
    }, [commentsCollection]);

    const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim() && user && commentsCollection) {
            const commentData = {
                author: {
                    name: user.displayName || 'مستخدم',
                    username: user.email?.split('@')[0] || 'user',
                    avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
                },
                content: newComment.trim(),
                createdAt: new Date().toISOString(),
                authorId: user.uid,
                postId: post.id,
            };
            addDocumentNonBlocking(commentsCollection, commentData);
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
                {isLoading && <p>تحميل التعليقات...</p>}
                {comments && comments.length > 0 ? comments.map(comment => (
                    <div key={comment.id} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
                            <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="bg-muted p-3 rounded-lg">
                                <Link href={`/home/profile/${comment.author.username?.toLowerCase()}`} className="font-semibold text-sm hover:underline">
                                    {comment.author.name}
                                </Link>
                                <p className="text-sm">{comment.content}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                )) : (
                    !isLoading && <p className="text-center text-muted-foreground">لا توجد تعليقات بعد. كن أول من يعلق!</p>
                )}
            </div>
        </ScrollArea>
        <Separator />
        <form onSubmit={handleAddComment} className="flex gap-2">
            <Input 
                placeholder="اكتب تعليقاً..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                disabled={!user}
            />
            <Button type="submit" disabled={!user || !newComment.trim()}>نشر</Button>
        </form>
      </div>
    </DialogContent>
    )
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  
  const [isLiked, setIsLiked] = useState(user && post.likeIds?.includes(user.uid));
  const [likeCount, setLikeCount] = useState(post.likeIds?.length || 0);

  useEffect(() => {
    setIsLiked(user && post.likeIds?.includes(user.uid));
    setLikeCount(post.likeIds?.length || 0);
  }, [post, user]);

  const postRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'posts', post.id)
  }, [firestore, post.id]);

  const handleLike = () => {
    if (!user || !postRef) return;

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);

    updateDocumentNonBlocking(postRef, {
        likeIds: newIsLiked ? arrayUnion(user.uid) : arrayRemove(user.uid)
    });
  };

  const commentsCount = useCollection(useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'posts', post.id, 'comments')
  }, [firestore, post.id]));

  const commentCount = commentsCount.data?.length ?? 0;

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
                <Link href={`/home/profile/${post.author.username?.toLowerCase()}`} className="font-semibold hover:underline">
                {post.author.name}
                </Link>
                <p className="text-xs text-muted-foreground">@{post.author.username} · {post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</p>
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
            <p>{commentCount} تعليق</p>
            </div>
            <Separator />
            <div className="grid w-full grid-cols-3 gap-2">
            <Button variant="ghost" className="gap-2" onClick={handleLike} disabled={!user}>
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
        <CommentsDialog post={post} />
    </Dialog>
  );
}

    