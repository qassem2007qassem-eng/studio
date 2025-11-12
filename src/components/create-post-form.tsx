
"use client";

import { ImageIcon, Paperclip, Smile, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useFirebase, useUser, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function CreatePostForm() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreatePost = async () => {
    if (!content.trim() || !user) {
      return;
    }
    setIsLoading(true);

    const postsCollection = collection(firestore, 'posts');
    const postData = {
      author: {
        name: user.displayName || 'مستخدم',
        username: user.email?.split('@')[0] || 'user',
        avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
      },
      authorId: user.uid,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likeIds: [],
    };

    try {
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
    return null; // Don't show the form if the user is not logged in
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar className="hidden sm:block">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
            <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="w-full space-y-4">
            <Textarea
              placeholder={`بماذا تفكر يا ${user.displayName?.split(' ')[0] || ''}؟`}
              className="border-0 focus-visible:ring-0 ring-offset-0 text-lg"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2 text-muted-foreground">
                <Button variant="ghost" size="icon" disabled>
                  <ImageIcon className="h-5 w-5" />
                  <span className="sr-only">Add image</span>
                </Button>
                <Button variant="ghost" size="icon" disabled>
                  <Paperclip className="h-5 w-5" />
                  <span className="sr-only">Attach file</span>
                </Button>
                <Button variant="ghost" size="icon" disabled>
                  <Smile className="h-5 w-5" />
                  <span className="sr-only">Add emoji</span>
                </Button>
              </div>
              <Button onClick={handleCreatePost} disabled={isLoading || !content.trim()}>
                {isLoading ? <Loader2 className="animate-spin" /> : "نشر"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
