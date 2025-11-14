

"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, MoreHorizontal, Share2, Flag, Trash2, Edit, X } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

import { type Post, type Comment, type User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, formatDistanceToNow } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { useUser, useCollection, useMemoFirebase } from "@/firebase";
import { 
    arrayRemove, 
    arrayUnion, 
    collection, 
    doc, 
    orderBy, 
    query, 
    serverTimestamp, 
    Timestamp, 
    addDoc,
    updateDoc
} from "firebase/firestore";
import { getCurrentUserProfile } from "@/services/user-service";
import { Skeleton } from "./ui/skeleton";
import { initializeFirebase } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { deletePost } from "@/services/post-service";
import { createReport } from "@/services/report-service";


interface PostCardProps {
  post: Post;
}

const backgroundOptions = [
  { id: 'default', value: 'bg-card text-foreground' },
  { id: 'gradient1', value: 'bg-gradient-to-br from-red-200 to-yellow-200 text-black' },
  { id: 'gradient2', value: 'bg-gradient-to-br from-blue-200 to-purple-200 text-black' },
  { id: 'gradient3', value: 'bg-gradient-to-br from-green-200 to-teal-200 text-black' },
  { id: 'gradient4', value: 'bg-gradient-to-br from-pink-200 to-rose-200 text-black' },
  { id: 'gradient5', value: 'bg-gray-800 text-white' },
];


const safeToDate = (timestamp: string | Timestamp | Date | undefined | null): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return null;
        }
        return date;
    } catch (e) {
        return null;
    }
};

// Simple admin check
const isAdminUser = (user: User | null) => {
    if (!user) return false;
    return user.email === 'admin@app.com';
};


const CommentsDialog = ({ post }: { post: Post }) => {
    const { user } = useUser();
    const [newComment, setNewComment] = useState("");
    const [isPosting, setIsPosting] = useState(false);


    const { firestore } = initializeFirebase();
    const commentsCollection = useMemoFirebase(() => {
        if (!post || !firestore) return null;
        return collection(firestore, 'posts', post.id, 'comments');
    }, [firestore, post]);

    const commentsQuery = useMemoFirebase(() => {
        if (!commentsCollection) return null;
        return query(commentsCollection, orderBy('createdAt', 'desc'));
    }, [commentsCollection]);

    const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        const profile = await getCurrentUserProfile();
        if (newComment.trim() && user && commentsCollection && profile) {
             setIsPosting(true);
             const commentData = {
                authorId: user.uid,
                postId: post.id,
                author: {
                    name: profile.name,
                    username: profile.username.toLowerCase(),
                    avatarUrl: profile.avatarUrl,
                },
                content: newComment.trim(),
                createdAt: serverTimestamp(),
            };
            await addDoc(commentsCollection, commentData);
            setNewComment("");
            setIsPosting(false);
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
                {comments && comments.length > 0 ? comments.map(comment => {
                    const commentDate = safeToDate(comment.createdAt);
                    return (
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
                                {commentDate && <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(commentDate)}</p>}
                            </div>
                        </div>
                    )
                }) : (
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
                disabled={!user || isPosting}
            />
            <Button type="submit" disabled={!user || !newComment.trim() || isPosting}>نشر</Button>
        </form>
      </div>
    </DialogContent>
    )
}

const FullScreenPostView = ({ post, onLike, isLiked, likeCount, commentCount }: { post: Post, onLike: () => void, isLiked: boolean, likeCount: number, commentCount: number }) => {
    const selectedBackground = backgroundOptions.find(opt => opt.id === post.background);

    return (
        <div className="fixed inset-0 z-50 flex flex-col">
            <div className={cn("flex-grow flex items-center justify-center text-center p-8", selectedBackground?.value)}>
                 <p className="text-3xl font-bold">{post.content}</p>
            </div>
            
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                 <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                     <MoreHorizontal />
                 </Button>
                 <DialogClose asChild>
                     <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                        <X />
                     </Button>
                 </DialogClose>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent text-white">
                <div className="flex justify-between items-center text-sm mb-2">
                    <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-white fill-white"/>
                        <span>{likeCount}</span>
                    </div>
                    <span>{commentCount} تعليق</span>
                </div>
                <Separator className="bg-white/30" />
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button variant="ghost" className="gap-2 text-white hover:bg-white/20" onClick={onLike}>
                        <Heart className={cn("h-5 w-5", isLiked && "fill-white text-white")} />
                        <span>أعجبني</span>
                    </Button>
                    {/* The main dialog trigger needs to be the card content itself, so we can't open another dialog from here easily.
                        We will just show the button but disable it for now. A more complex implementation would be needed. */}
                    <Button variant="ghost" className="gap-2 text-white hover:bg-white/20" disabled>
                        <MessageCircle className="h-5 w-5" />
                        <span>تعليق</span>
                    </Button>
                    <Button variant="ghost" className="gap-2 text-white hover:bg-white/20">
                        <Share2 className="h-5 w-5" />
                        <span>مشاركة</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};


export function PostCard({ post }: PostCardProps) {
  const { user } = useUser();
  const { firestore } = initializeFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isReportAlertOpen, setIsReportAlertOpen] = useState(false);
  
  const isOwner = user?.uid === post.authorId;
  const isAdmin = user?.email === 'admin@app.com';

  useEffect(() => {
    setIsLiked(!!user && !!post.likeIds?.includes(user.uid));
    setLikeCount(post.likeIds?.length || 0);
  }, [post, user]);

  const postRef = useMemoFirebase(() => {
    if (!firestore || !post.id) return null;
    return doc(firestore, 'posts', post.id)
  }, [firestore, post.id]);

  const handleLike = () => {
    if (!user || !postRef) return;

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);

    updateDoc(postRef, {
        likeIds: newIsLiked ? arrayUnion(user.uid) : arrayRemove(user.uid)
    }).catch(err => {
        console.error("Failed to update like status", err);
        // Revert UI on error
        setIsLiked(!newIsLiked);
        setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
    });
  };
  
  const handleDelete = async () => {
    if (!isOwner && !isAdmin) return;
    try {
        await deletePost(post.id, post.imageUrls, isAdmin);
        toast({ title: "تم حذف المنشور بنجاح."});
        setIsDeleteAlertOpen(false);
        router.refresh(); 
    } catch(error) {
        console.error("Error deleting post:", error);
        toast({ title: "خطأ", description: "لم نتمكن من حذف المنشور.", variant: "destructive" });
    }
  }

  const handleReport = async () => {
    if (!user) {
        toast({ title: "خطأ", description: "يجب عليك تسجيل الدخول للإبلاغ عن منشور.", variant: "destructive"});
        return;
    }
    try {
        await createReport({
            reportedEntityType: 'post',
            reportedEntityId: post.id,
            reason: "محتوى غير لائق",
        });
        toast({ title: "تم إرسال البلاغ", description: "شكرًا لك، سنقوم بمراجعة بلاغك." });
    } catch(error) {
        console.error("Error creating report:", error);
        toast({ title: "خطأ", description: "لم نتمكن من إرسال بلاغك. حاول مرة أخرى.", variant: "destructive" });
    }
    setIsReportAlertOpen(false);
  }

  const commentsCollectionQuery = useMemoFirebase(() => {
    if (!firestore || !post.id) return null;
    return query(collection(firestore, 'posts', post.id, 'comments'))
  }, [firestore, post.id]);

  const { data: comments } = useCollection(commentsCollectionQuery);

  const commentCount = comments?.length ?? 0;
  const postDate = safeToDate(post.createdAt);

  if (!post || !post.author) {
    return <Card><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>;
  }

  const hasImages = post.imageUrls && post.imageUrls.length > 0;
  
  const selectedBackground = useMemo(() => {
    const bgOption = backgroundOptions.find(opt => opt.id === post.background);
    if (!bgOption || bgOption.id === 'default' || hasImages) {
      return null;
    }
    return bgOption;
  }, [post.background, hasImages]);

  const hasBackground = !!selectedBackground;
  
  const TEXT_TRUNCATION_LIMIT = 150;
  const isTextLong = post.content.length > TEXT_TRUNCATION_LIMIT;
  const showTruncated = hasBackground && isTextLong;


  const renderPostContent = () => {
    const contentToShow = showTruncated 
        ? `${post.content.substring(0, TEXT_TRUNCATION_LIMIT)}...` 
        : post.content;
    
    return (
      <div className={cn(
        "p-4",
        hasBackground && "min-h-[200px] flex items-center justify-center text-center rounded-lg",
        hasBackground && showTruncated && "cursor-pointer hover:opacity-90 transition-opacity",
        selectedBackground?.value,
      )}>
        <p className={cn(
          "whitespace-pre-wrap",
          hasBackground ? "text-2xl font-bold" : "text-base"
        )}>
          {contentToShow}
        </p>
      </div>
    );
  };


  return (
    <Dialog>
        <Card className="overflow-hidden bg-card">
            <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                        <AvatarFallback>{post.author.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5">
                        <Link href={`/home/profile/${post.author.username?.toLowerCase()}`} className="font-semibold hover:underline">
                        {post.author.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{post.author.username?.toLowerCase()} · {postDate ? formatDistanceToNow(postDate) : ''}</p>
                    </div>
                    <div className="me-auto ms-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            {(isOwner || isAdmin) && (
                                <>
                                    <DropdownMenuItem disabled>
                                        <Edit className="ms-2 h-4 w-4" />
                                        <span>تعديل المنشور</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsDeleteAlertOpen(true)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="ms-2 h-4 w-4" />
                                        <span>{isAdmin && !isOwner ? "حذف (مشرف)" : "حذف"}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            {!isOwner && 
                                <DropdownMenuItem onClick={() => setIsReportAlertOpen(true)}>
                                    <Flag className="ms-2 h-4 w-4" />
                                    <span>إبلاغ عن المنشور</span>
                                </DropdownMenuItem>
                            }
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
                {post.content && (
                  showTruncated ? (
                    <DialogTrigger asChild>
                      {renderPostContent()}
                    </DialogTrigger>
                  ) : (
                    renderPostContent()
                  )
                )}
                {hasImages && (
                    <div className={cn(
                        "grid gap-2 p-4",
                        post.imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                        post.imageUrls.length > 2 ? "grid-cols-2" : ""
                    )}>
                        {post.imageUrls.map((imageUrl, index) => (
                            <div key={index} className={cn(
                                "relative w-full overflow-hidden rounded-lg border",
                                post.imageUrls.length === 1 ? "aspect-video" : "aspect-square",
                                post.imageUrls.length === 3 && index === 0 ? "col-span-2 row-span-2" : ""
                            )}>
                                <Image
                                    src={imageUrl}
                                    alt={`Post image ${index + 1}`}
                                    data-ai-hint="post image"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 p-4">
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
        
        {showTruncated ? (
            <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-full h-full max-h-full sm:max-w-full sm:h-full sm:max-h-full !rounded-none">
                 <FullScreenPostView post={post} onLike={handleLike} isLiked={isLiked} likeCount={likeCount} commentCount={commentCount} />
            </DialogContent>
        ) : (
            <CommentsDialog post={post} />
        )}

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                    <AlertDialogDescription>
                        هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف منشورك بشكل دائم من خوادمنا.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isReportAlertOpen} onOpenChange={setIsReportAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>الإبلاغ عن محتوى</AlertDialogTitle>
                    <AlertDialogDescription>
                       هل أنت متأكد أنك تريد الإبلاغ عن هذا المنشور؟ سيتم إرسال بلاغك إلى المشرفين للمراجعة.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReport}>إبلاغ</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Dialog>
  );
}
