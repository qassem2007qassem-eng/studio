
"use client";

import { ImageIcon, Paperclip, Smile, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFirebase, useUser, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Separator } from "./ui/separator";

export function CreatePostForm() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreatePost = async () => {
    if (!content.trim() || !user || !firestore) {
      return;
    }
    setIsLoading(true);

    try {
      const postsCollection = collection(firestore, 'posts');
      const postData = {
        author: {
          name: user.displayName || 'مستخدم',
          username: user.email?.split('@')[0]?.toLowerCase() || 'user',
          avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        },
        authorId: user.uid,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        likeIds: [],
      };

      await addDocumentNonBlocking(postsCollection, postData);
      setContent("");
      toast({
        title: "نجاح",
        description: "تم نشر منشورك بنجاح.",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "لم نتمكن من نشر منشورك. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null; 
  }
  
  const username = user.email?.split('@')[0]?.toLowerCase();

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/home/profile/${username}`}>
            <Avatar>
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
              <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
             <input
                placeholder={`بماذا تفكر يا ${user.displayName?.split(' ')[0] || ''}؟`}
                className="w-full rounded-full bg-muted px-4 py-2 text-md border-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isLoading}
             />
          </div>
           <Button onClick={handleCreatePost} disabled={isLoading || !content.trim()}>
                {isLoading ? <Loader2 className="animate-spin" /> : "نشر"}
            </Button>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-2">
            <Button variant="ghost" className="gap-2 text-muted-foreground" disabled>
                <ImageIcon className="h-5 w-5 text-red-500"/>
                <span>صورة/فيديو</span>
            </Button>
            <Button variant="ghost" className="gap-2 text-muted-foreground" disabled>
                <Smile className="h-5 w-5 text-yellow-500"/>
                <span>شعور/نشاط</span>
            </Button>
            <Button variant="ghost" className="gap-2 text-muted-foreground" disabled>
                <Paperclip className="h-5 w-5 text-green-500"/>
                <span>مرفق</span>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
